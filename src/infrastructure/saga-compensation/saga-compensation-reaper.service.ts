import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Interval } from '@nestjs/schedule'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { LogContext } from '@distributed-social-platform/shared-kernel'
import { PrismaSagaCompensationRepository } from './prisma-saga-compensation.repository'
import { SagaCompensationRegistry } from './saga-compensation.registry'
import { ScheduledJobRegistry } from '@/infrastructure/scheduled-jobs/scheduled-job-registry.service'

const POLL_JOB_NAME = 'SagaCompensationReaperService.poll'
const REAP_JOB_NAME = 'SagaCompensationReaperService.reapStaleClaims'

/**
 * Retries saga compensation steps that failed on their first, in-process
 * attempt (see `PrismaSagaCompensationRepository.recordFailed`, written from
 * `CommandBus.runSaga`). Combines the two jobs `Outbox` keeps as separate
 * services (`PollingPublisherService` + `OutboxReaperService`) into one class:
 * compensation retry has no consumer-lag/throughput concern to justify a
 * tighter, separately-tunable poll cadence — this is a low-volume safety net
 * (one saga exists in the whole system today), not a hot path.
 */
@Injectable()
export class SagaCompensationReaperService {
  private polling = false
  private reaping = false
  private readonly maxAttempts: number
  private readonly pollBatchSize: number
  private readonly claimTimeoutMs: number

  constructor(
    private readonly repo: PrismaSagaCompensationRepository,
    private readonly registry: SagaCompensationRegistry,
    @InjectPinoLogger(SagaCompensationReaperService.name) private readonly logger: PinoLogger,
    private readonly jobRegistry: ScheduledJobRegistry,
    config: ConfigService,
  ) {
    this.maxAttempts = config.getOrThrow<number>('env.sagaCompensationMaxAttempts')
    this.pollBatchSize = config.getOrThrow<number>('env.sagaCompensationPollBatchSize')
    this.claimTimeoutMs = config.getOrThrow<number>('env.sagaCompensationClaimTimeoutMs')
    this.jobRegistry.register({
      name: POLL_JOB_NAME,
      schedule: '@Interval(5000)',
      file: 'apps/core-api/src/infrastructure/saga-compensation/saga-compensation-reaper.service.ts',
      purpose: 'Retry saga compensation steps that failed on their first attempt',
    })
    this.jobRegistry.register({
      name: REAP_JOB_NAME,
      schedule: '@Interval(30000)',
      file: 'apps/core-api/src/infrastructure/saga-compensation/saga-compensation-reaper.service.ts',
      purpose: 'Recover stale INFLIGHT saga_compensations rows back to PENDING',
    })
  }

  @Interval(5000)
  async poll(): Promise<void> {
    if (this.polling) return
    this.polling = true

    try {
      const rows = await this.repo.claimPendingBatch(this.pollBatchSize)
      if (rows.length === 0) {
        this.jobRegistry.recordSuccess(POLL_JOB_NAME)
        return
      }

      for (const row of rows) {
        try {
          const runner = this.registry.get(row.actionType)
          await runner(row.payload as Record<string, unknown>)
          await this.repo.markProcessed(row.id)
          this.logger.info(
            { context: LogContext.COMMAND_BUS, id: row.id, actionType: row.actionType },
            'Saga compensation retried successfully',
          )
        } catch (err) {
          await this.repo.markFailed(row.id, row.attempts, String(err), this.maxAttempts)
          this.logger.warn(
            {
              context: LogContext.COMMAND_BUS,
              id: row.id,
              sagaCommand: row.sagaCommand,
              actionType: row.actionType,
              attempts: row.attempts + 1,
              err,
            },
            'Saga compensation retry failed',
          )
        }
      }
      this.jobRegistry.recordSuccess(POLL_JOB_NAME)
    } catch (err) {
      // Only claimPendingBatch itself can reach here — per-row failures are
      // already caught above and never escape the for-loop.
      this.jobRegistry.recordFailure(POLL_JOB_NAME)
      this.logger.error(
        { context: LogContext.COMMAND_BUS, err },
        'Saga compensation poll tick failed unexpectedly',
      )
    } finally {
      this.polling = false
    }
  }

  @Interval(30000)
  async reapStaleClaims(): Promise<void> {
    if (this.reaping) return
    this.reaping = true

    try {
      const reaped = await this.repo.reapStaleInflight(this.claimTimeoutMs)
      if (reaped > 0) {
        this.logger.warn(
          { context: LogContext.COMMAND_BUS, reaped },
          'Reaped stale INFLIGHT saga_compensations rows back to PENDING',
        )
      }
      this.jobRegistry.recordSuccess(REAP_JOB_NAME)
    } catch (err) {
      this.jobRegistry.recordFailure(REAP_JOB_NAME)
      this.logger.error(
        { context: LogContext.COMMAND_BUS, err },
        'Saga compensation reap tick failed unexpectedly',
      )
    } finally {
      this.reaping = false
    }
  }
}
