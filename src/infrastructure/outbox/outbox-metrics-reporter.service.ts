import { Inject, Injectable } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { LogContext } from '@distributed-social-platform/shared-kernel'
import {
  OUTBOX_DISPATCH_REPOSITORY,
  type IOutboxDispatchRepository,
} from './outbox.repository'
import { outboxBacklogGauge } from '@/infrastructure/observability/outbox.metrics'
import { ScheduledJobRegistry } from '@/infrastructure/scheduled-jobs/scheduled-job-registry.service'

const JOB_NAME = 'OutboxMetricsReporter'

/**
 * Only job: keep `core_api_outbox_backlog` current. Before this, seeing how
 * many rows sat PENDING/INFLIGHT/FAILED_DLQ right now meant a manual
 * `SELECT status, COUNT(*) FROM outbox_events GROUP BY status` — this is that
 * query, on a timer, exposed on GET /metrics instead.
 *
 * Separate class from OutboxReaperService on purpose, even though both run on
 * an interval and touch the same table — reporting a snapshot and recovering
 * stale claims are different concerns (SRP); reusing the reaper's tick would
 * couple "how often we look" to "how often we fix", which don't need to match.
 */
@Injectable()
export class OutboxMetricsReporter {
  constructor(
    @Inject(OUTBOX_DISPATCH_REPOSITORY) private readonly outboxRepo: IOutboxDispatchRepository,
    @InjectPinoLogger(OutboxMetricsReporter.name) private readonly logger: PinoLogger,
    private readonly jobRegistry: ScheduledJobRegistry,
  ) {
    this.jobRegistry.register({
      name: JOB_NAME,
      schedule: '@Interval(30000)',
      file: 'apps/core-api/src/infrastructure/outbox/outbox-metrics-reporter.service.ts',
      purpose: 'Snapshot outbox row count per status onto core_api_outbox_backlog',
    })
  }

  @Interval(30000)
  async reportBacklog(): Promise<void> {
    try {
      const counts = await this.outboxRepo.countByStatus()
      for (const [status, count] of Object.entries(counts)) {
        outboxBacklogGauge.set({ status }, count)
      }
      this.jobRegistry.recordSuccess(JOB_NAME)
    } catch (err) {
      this.jobRegistry.recordFailure(JOB_NAME)
      this.logger.error(
        { context: LogContext.OUTBOX, err },
        'Outbox metrics reporter tick failed unexpectedly',
      )
    }
  }
}
