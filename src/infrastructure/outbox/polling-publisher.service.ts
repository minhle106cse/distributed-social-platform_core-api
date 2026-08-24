import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Interval } from '@nestjs/schedule'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import {
  LogContext,
  MESSAGE_PUBLISHER,
  OutboxPublisher,
  type IMessagePublisher,
} from '@distributed-social-platform/shared-kernel'
import { PrismaOutboxRepository } from './prisma-outbox.repository'
import { outboxDeadLetterCounter } from '@/infrastructure/observability/outbox.metrics'
import { ScheduledJobRegistry } from '@/infrastructure/scheduled-jobs/scheduled-job-registry.service'

const JOB_NAME = 'PollingPublisherService'

/**
 * Nest scheduler shell around shared-kernel's `OutboxPublisher`.
 *
 * The claim/publish/mark loop, the CloudEvent mapping and the DLQ decision moved
 * to shared-kernel on 2026-08-24: the outbox is a capability, identical wherever
 * it is adopted, and the second service to need it should wire ~20 lines rather
 * than copy ~90. What is legitimately per-service stays here — the tick
 * (`@Interval`), the re-entrancy guard, the job registry, the prom-client counter,
 * and the config. Stale-INFLIGHT recovery is a different concern on a different
 * cadence: OutboxReaperService.
 */
@Injectable()
export class PollingPublisherService {
  private running = false
  private readonly engine: OutboxPublisher

  constructor(
    outboxRepo: PrismaOutboxRepository,
    @Inject(MESSAGE_PUBLISHER) publisher: IMessagePublisher,
    @InjectPinoLogger(PollingPublisherService.name) private readonly logger: PinoLogger,
    private readonly jobRegistry: ScheduledJobRegistry,
    config: ConfigService,
  ) {
    this.engine = new OutboxPublisher({
      store: outboxRepo,
      publisher,
      logger: this.logger,
      sourcePrefix: '/cortex/core-api',
      maxAttempts: config.getOrThrow<number>('env.outboxMaxAttempts'),
      batchSize: config.getOrThrow<number>('env.outboxPollBatchSize'),
      onDeadLetter: (eventType) => outboxDeadLetterCounter.inc({ eventType }),
    })
    this.jobRegistry.register({
      name: JOB_NAME,
      schedule: '@Interval(2000)',
      file: 'apps/core-api/src/infrastructure/outbox/polling-publisher.service.ts',
      purpose: 'Move PENDING outbox rows to Kafka/queue (Transactional Outbox)',
    })
  }

  @Interval(2000)
  async poll(): Promise<void> {
    if (this.running) return
    this.running = true

    try {
      await this.engine.pollOnce()
      this.jobRegistry.recordSuccess(JOB_NAME)
    } catch (err) {
      // Only claimPendingBatch can reach here — the engine marks and swallows
      // per-event failures so one bad row never stalls the batch. Swallowed (not
      // rethrown) on purpose: one failing tick must not kill the process, and
      // without this catch the job would die quietly, which is the exact bug
      // fixed on 2026-07-31.
      this.jobRegistry.recordFailure(JOB_NAME)
      this.logger.error(
        { context: LogContext.OUTBOX, err },
        'Outbox polling tick failed unexpectedly',
      )
    } finally {
      this.running = false
    }
  }
}
