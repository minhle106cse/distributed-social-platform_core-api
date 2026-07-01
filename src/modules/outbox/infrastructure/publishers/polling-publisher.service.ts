import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Interval } from '@nestjs/schedule'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import {
  MESSAGE_PUBLISHER,
  type CloudEvent,
  type IMessagePublisher,
} from '@distributed-social-platform/shared-kernel'
import { Prisma } from '@/generated'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'

@Injectable()
export class PollingPublisherService {
  private running = false
  private reaping = false
  private readonly maxAttempts: number
  private readonly pollBatchSize: number
  private readonly claimTimeoutMs: number

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MESSAGE_PUBLISHER) private readonly publisher: IMessagePublisher,
    @InjectPinoLogger(PollingPublisherService.name) private readonly logger: PinoLogger,
    config: ConfigService,
  ) {
    this.maxAttempts = config.get<number>('env.outboxMaxAttempts') ?? 5
    this.pollBatchSize = config.get<number>('env.outboxPollBatchSize') ?? 50
    this.claimTimeoutMs = config.get<number>('env.outboxClaimTimeoutMs') ?? 60000
  }

  @Interval(2000)
  async poll(): Promise<void> {
    if (this.running) return
    this.running = true

    try {
      // HA-safe claim: atomically flip a batch of PENDING rows to INFLIGHT under
      // FOR UPDATE SKIP LOCKED, so two publisher replicas never grab the same row
      // (each skips rows the other has locked). Publishing happens OUTSIDE any DB
      // transaction — we never hold row locks across Kafka network I/O.
      const claimed = await this.prisma.client.$queryRaw<{ id: string }[]>(Prisma.sql`
        UPDATE outbox_events
        SET status = 'INFLIGHT'::"OutboxStatus", claimed_at = NOW()
        WHERE id IN (
          SELECT id FROM outbox_events
          WHERE status = 'PENDING'::"OutboxStatus"
          ORDER BY created_at ASC
          LIMIT ${this.pollBatchSize}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id
      `)

      if (claimed.length === 0) return

      const events = await this.prisma.client.outboxEvent.findMany({
        where: { id: { in: claimed.map((r) => r.id) } },
        orderBy: { createdAt: 'asc' },
      })

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
            orgid: (event.payload as Record<string, string>).orgId ?? '',
            partitionkey: event.aggregateId,
          }

          await this.publisher.publish(cloudEvent)

          await this.prisma.client.outboxEvent.update({
            where: { id: event.id },
            data: { status: 'PROCESSED', processedAt: new Date(), claimedAt: null },
          })
        } catch (err) {
          const nextAttempts = event.attempts + 1
          const nextStatus = nextAttempts >= this.maxAttempts ? 'FAILED_DLQ' : 'PENDING'

          await this.prisma.client.outboxEvent.update({
            where: { id: event.id },
            data: {
              attempts: nextAttempts,
              lastError: String(err),
              status: nextStatus,
              claimedAt: null,
            },
          })

          this.logger.warn(
            { eventId: event.id, attempts: nextAttempts, err },
            'Failed to publish outbox event',
          )
        }
      }
    } finally {
      this.running = false
    }
  }

  /**
   * Reaper: recover rows a publisher claimed (INFLIGHT) but never resolved because
   * the process crashed between claim and mark. Any INFLIGHT row older than the
   * claim timeout is returned to PENDING for another poll. Safe under at-least-once:
   * if the row was actually published before the crash, redelivery is deduped by
   * the idempotent consumer.
   */
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
