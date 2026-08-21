import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Interval } from '@nestjs/schedule'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { LogContext } from '@distributed-social-platform/shared-kernel'
import { OUTBOX_DISPATCH_REPOSITORY, type IOutboxDispatchRepository } from './outbox.repository'
import { ScheduledJobRegistry } from '@/infrastructure/scheduled-jobs/scheduled-job-registry.service'

const JOB_NAME = 'OutboxReaperService'

/**
 * Reaper — recovers outbox rows a publisher claimed (INFLIGHT) but never
 * resolved because the process crashed between claim and publish. Any INFLIGHT
 * row older than the claim timeout is returned to PENDING for another poll.
 * Safe under at-least-once: if the row was actually published before the
 * crash, redelivery is deduped by the idempotent consumer. Separate service
 * from PollingPublisherService — different failure mode, different cadence.
 *
 * Driving adapter only — the reap threshold/query lives behind
 * IOutboxDispatchRepository (see polling-publisher.service.ts for the same rationale).
 */
@Injectable()
export class OutboxReaperService {
  private reaping = false
  private readonly claimTimeoutMs: number

  constructor(
    @Inject(OUTBOX_DISPATCH_REPOSITORY) private readonly outboxRepo: IOutboxDispatchRepository,
    @InjectPinoLogger(OutboxReaperService.name) private readonly logger: PinoLogger,
    private readonly jobRegistry: ScheduledJobRegistry,
    config: ConfigService,
  ) {
    this.claimTimeoutMs = config.getOrThrow<number>('env.outboxClaimTimeoutMs')
    this.jobRegistry.register({
      name: JOB_NAME,
      schedule: '@Interval(30000)',
      file: 'apps/core-api/src/infrastructure/outbox/outbox-reaper.service.ts',
      purpose: 'Recover stale INFLIGHT outbox rows back to PENDING after a publisher crash',
    })
  }

  @Interval(30000)
  async reapStaleClaims(): Promise<void> {
    if (this.reaping) return
    this.reaping = true

    try {
      const reaped = await this.outboxRepo.reapStaleInflight(this.claimTimeoutMs)
      if (reaped > 0) {
        this.logger.warn(
          { context: LogContext.OUTBOX, reaped },
          'Reaped stale INFLIGHT outbox rows back to PENDING',
        )
      }
      this.jobRegistry.recordSuccess(JOB_NAME)
    } catch (err) {
      this.jobRegistry.recordFailure(JOB_NAME)
      this.logger.error(
        { context: LogContext.OUTBOX, err },
        'Outbox reaper tick failed unexpectedly',
      )
    } finally {
      this.reaping = false
    }
  }
}
