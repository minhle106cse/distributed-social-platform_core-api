import { Injectable } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'

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
  ) {}

  @Cron('0 3 * * *') // 03:00 daily
  async purgeExpired(): Promise<void> {
    if (this.running) return
    this.running = true

    try {
      const { count } = await this.prisma.client.idempotencyRecord.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      })
      if (count > 0) this.logger.info({ purged: count }, 'Purged expired idempotency records')
    } finally {
      this.running = false
    }
  }
}
