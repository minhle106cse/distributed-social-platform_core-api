import { Injectable } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { LogContext } from '@distributed-social-platform/shared-kernel'
import { PrismaOutboxRepository } from './prisma-outbox.repository'
import { ScheduledJobRegistry } from '@/infrastructure/scheduled-jobs/scheduled-job-registry.service'

const JOB_NAME = 'OutboxCleanupService'

/**
 * Nightly reaper for old PROCESSED outbox rows — same reasoning and shape as
 * `IdempotencyCleanupService` (resilience_patterns.md §1): Postgres never
 * expires a row on its own, so without this the table grows unbounded
 * forever. FAILED_DLQ rows are NEVER touched here — those need a human to
 * triage first (eventing_patterns.md §4.1), only successfully-completed rows
 * are safe to delete on a timer.
 */
@Injectable()
export class OutboxCleanupService {
  private running = false
  private readonly retentionDays: number

  constructor(
    private readonly outboxRepo: PrismaOutboxRepository,
    @InjectPinoLogger(OutboxCleanupService.name) private readonly logger: PinoLogger,
    private readonly jobRegistry: ScheduledJobRegistry,
    config: ConfigService,
  ) {
    this.retentionDays = config.getOrThrow<number>('env.outboxPurgeRetentionDays')
    this.jobRegistry.register({
      name: JOB_NAME,
      schedule: "@Cron('0 3 * * *')",
      file: 'apps/core-api/src/infrastructure/outbox/outbox-cleanup.service.ts',
      purpose: 'Delete old PROCESSED outbox rows (never touches FAILED_DLQ)',
    })
  }

  @Cron('0 3 * * *') // 03:00 daily
  async purgeProcessed(): Promise<void> {
    if (this.running) return
    this.running = true

    try {
      const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000)
      const purged = await this.outboxRepo.purgeProcessed(cutoff)
      if (purged > 0) {
        this.logger.info(
          { context: LogContext.OUTBOX, purged, retentionDays: this.retentionDays },
          'Purged old PROCESSED outbox rows',
        )
      }
      this.jobRegistry.recordSuccess(JOB_NAME)
    } catch (err) {
      this.jobRegistry.recordFailure(JOB_NAME)
      this.logger.error(
        { context: LogContext.OUTBOX, err },
        'Outbox cleanup tick failed unexpectedly',
      )
    } finally {
      this.running = false
    }
  }
}
