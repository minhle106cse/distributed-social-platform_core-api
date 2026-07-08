import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Interval } from '@nestjs/schedule'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { Prisma } from '@/generated'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'

/**
 * Reaper — recovers outbox rows a publisher claimed (INFLIGHT) but never
 * resolved because the process crashed between claim and publish. Any INFLIGHT
 * row older than the claim timeout is returned to PENDING for another poll.
 * Safe under at-least-once: if the row was actually published before the
 * crash, redelivery is deduped by the idempotent consumer. Separate service
 * from PollingPublisherService — different failure mode, different cadence.
 */
@Injectable()
export class OutboxReaperService {
  private reaping = false
  private readonly claimTimeoutMs: number

  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(OutboxReaperService.name) private readonly logger: PinoLogger,
    config: ConfigService,
  ) {
    this.claimTimeoutMs = config.getOrThrow<number>('env.outboxClaimTimeoutMs')
  }

  @Interval(30000)
  async reapStaleClaims(): Promise<void> {
    if (this.reaping) return
    this.reaping = true

    try {
      const claimTimeoutSec = Math.ceil(this.claimTimeoutMs / 1000)
      const reaped = await this.prisma.client.$executeRaw(Prisma.sql`
        UPDATE outbox_events
        SET status = 'PENDING'::"OutboxStatus", claimed_at = NULL
        WHERE status = 'INFLIGHT'::"OutboxStatus"
          AND claimed_at < NOW() - make_interval(secs => ${claimTimeoutSec})
      `)

      if (reaped > 0) {
        this.logger.warn({ reaped }, 'Reaped stale INFLIGHT outbox rows back to PENDING')
      }
    } finally {
      this.reaping = false
    }
  }
}
