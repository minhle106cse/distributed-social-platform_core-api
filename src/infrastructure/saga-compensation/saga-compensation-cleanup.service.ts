import { Injectable } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { LogContext } from '@distributed-social-platform/shared-kernel'
import { PrismaSagaCompensationRepository } from './prisma-saga-compensation.repository'
import { ScheduledJobRegistry } from '@/infrastructure/scheduled-jobs/scheduled-job-registry.service'

const JOB_NAME = 'SagaCompensationCleanupService'

/**
 * Nightly reaper for old DONE saga compensation rows — same reasoning and
 * shape as `OutboxCleanupService`/`IdempotencyCleanupService`: Postgres never
 * expires a row on its own, so without this the table grows unbounded
 * forever. FAILED_DLQ rows are NEVER touched here — those need a human to
 * triage first, only successfully-completed rows are safe to delete on a timer.
 */
@Injectable()
export class SagaCompensationCleanupService {
  private running = false
  private readonly retentionDays: number

  constructor(
    private readonly repo: PrismaSagaCompensationRepository,
    @InjectPinoLogger(SagaCompensationCleanupService.name) private readonly logger: PinoLogger,
    private readonly jobRegistry: ScheduledJobRegistry,
    config: ConfigService,
  ) {
    this.retentionDays = config.getOrThrow<number>('env.sagaCompensationPurgeRetentionDays')
    this.jobRegistry.register({
      name: JOB_NAME,
      schedule: "@Cron('0 3 * * *')",
      file: 'apps/core-api/src/infrastructure/saga-compensation/saga-compensation-cleanup.service.ts',
      purpose: 'Delete old DONE saga compensation rows (never touches FAILED_DLQ)',
    })
  }

  @Cron('0 3 * * *') // 03:00 daily
  async purgeProcessed(): Promise<void> {
    if (this.running) return
    this.running = true

    try {
      const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000)
      const purged = await this.repo.purgeProcessed(cutoff)
      if (purged > 0) {
        this.logger.info(
          { context: LogContext.COMMAND_BUS, purged, retentionDays: this.retentionDays },
          'Purged old DONE saga compensation rows',
        )
      }
      this.jobRegistry.recordSuccess(JOB_NAME)
    } catch (err) {
      this.jobRegistry.recordFailure(JOB_NAME)
      this.logger.error(
        { context: LogContext.COMMAND_BUS, err },
        'Saga compensation cleanup tick failed unexpectedly',
      )
    } finally {
      this.running = false
    }
  }
}
