import { Injectable } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { LogContext } from '@distributed-social-platform/shared-kernel'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { ScheduledJobRegistry } from '@/infrastructure/scheduled-jobs/scheduled-job-registry.service'

const JOB_NAME = 'IdempotencyCleanupService'

/**
 * Nightly reaper for expired idempotency keys. The IdempotencyInterceptor stores each
 * key with a 24h TTL but never deletes; without this the table grows unbounded
 * (resilience_patterns.md §1 — "Cron cleanup ... chạy mỗi đêm").
 */
@Injectable()
export class IdempotencyCleanupService {
  private running = false

  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(IdempotencyCleanupService.name) private readonly logger: PinoLogger,
    private readonly jobRegistry: ScheduledJobRegistry,
  ) {
    this.jobRegistry.register({
      name: JOB_NAME,
      schedule: "@Cron('0 3 * * *')",
      file: 'apps/core-api/src/infrastructure/http/idempotency/idempotency-cleanup.service.ts',
      purpose: 'Delete expired idempotency keys (24h TTL)',
    })
  }

  @Cron('0 3 * * *') // 03:00 daily
  async purgeExpired(): Promise<void> {
    if (this.running) return
    this.running = true

    try {
      const { count } = await this.prisma.client.idempotencyRecord.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      })
      if (count > 0) {
        this.logger.info(
          { context: LogContext.IDEMPOTENCY, purged: count },
          'Purged expired idempotency records',
        )
      }
      this.jobRegistry.recordSuccess(JOB_NAME)
    } catch (err) {
      this.jobRegistry.recordFailure(JOB_NAME)
      this.logger.error(
        { context: LogContext.IDEMPOTENCY, err },
        'Idempotency cleanup tick failed unexpectedly',
      )
    } finally {
      this.running = false
    }
  }
}
