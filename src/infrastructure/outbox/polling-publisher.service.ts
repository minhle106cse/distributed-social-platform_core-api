import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Interval } from '@nestjs/schedule'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import {
  LogContext,
  MESSAGE_PUBLISHER,
  type CloudEvent,
  type IMessagePublisher,
} from '@distributed-social-platform/shared-kernel'
import {
  OUTBOX_DISPATCH_REPOSITORY,
  type IOutboxDispatchRepository,
} from './outbox.repository'
import { outboxDeadLetterCounter } from '@/infrastructure/observability/outbox.metrics'
import { ScheduledJobRegistry } from '@/infrastructure/scheduled-jobs/scheduled-job-registry.service'

const JOB_NAME = 'PollingPublisherService'

/**
 * Polling Publisher (microservices.io) — the half of the Transactional Outbox
 * that moves rows from PENDING to Kafka/queue. Stale-INFLIGHT recovery after a
 * publisher crash is a separate concern, handled by OutboxReaperService.
 *
 * Driving adapter only — the claim/publish/mark algorithm lives behind
 * IOutboxDispatchRepository (Hexagonal: swapping the scheduler trigger or the ORM
 * touches only 1 side of this class, never both).
 */
@Injectable()
export class PollingPublisherService {
  private running = false
  private readonly maxAttempts: number
  private readonly pollBatchSize: number

  constructor(
    @Inject(OUTBOX_DISPATCH_REPOSITORY) private readonly outboxRepo: IOutboxDispatchRepository,
    @Inject(MESSAGE_PUBLISHER) private readonly publisher: IMessagePublisher,
    @InjectPinoLogger(PollingPublisherService.name) private readonly logger: PinoLogger,
    private readonly jobRegistry: ScheduledJobRegistry,
    config: ConfigService,
  ) {
    this.maxAttempts = config.getOrThrow<number>('env.outboxMaxAttempts')
    this.pollBatchSize = config.getOrThrow<number>('env.outboxPollBatchSize')
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
      const events = await this.outboxRepo.claimPendingBatch(this.pollBatchSize)
      if (events.length === 0) {
        this.jobRegistry.recordSuccess(JOB_NAME)
        return
      }

      for (const event of events) {
        try {
          // Map the internal outbox row → public CloudEvents 1.0 wire contract.
          const cloudEvent: CloudEvent = {
            specversion: '1.0',
            id: event.id,
            source: `/cortex/core-api/${event.aggregateType}`,
            type: event.eventType,
            time: event.createdAt.toISOString(),
            subject: event.aggregateId,
            datacontenttype: 'application/json',
            data: event.payload,
            orgid: event.orgId,
            partitionkey: event.aggregateId,
            traceparent: event.traceparent ?? undefined,
          }

          await this.publisher.publish(cloudEvent)
          await this.outboxRepo.markProcessed(event.id)
        } catch (err) {
          await this.outboxRepo.markFailed(event.id, event.attempts, String(err), this.maxAttempts)

          // markFailed decides PENDING (retry) vs FAILED_DLQ (terminal) using
          // this exact same comparison internally (prisma-outbox.repository.ts)
          // — recomputed here, not returned by markFailed, so the two stay in
          // sync without widening the repository port for a caller-only concern.
          const isNowDead = event.attempts + 1 >= this.maxAttempts
          if (isNowDead) {
            outboxDeadLetterCounter.inc({ eventType: event.eventType })
            this.logger.warn(
              { context: LogContext.OUTBOX, eventId: event.id, attempts: event.attempts + 1, err },
              'Outbox event exhausted retry budget — permanently FAILED_DLQ, needs manual triage',
            )
          } else {
            this.logger.warn(
              { context: LogContext.OUTBOX, eventId: event.id, attempts: event.attempts + 1, err },
              'Failed to publish outbox event — will retry',
            )
          }
        }
      }
      this.jobRegistry.recordSuccess(JOB_NAME)
    } catch (err) {
      // Only claimPendingBatch itself can reach here — per-event failures are
      // already caught above and never escape the for-loop.
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
