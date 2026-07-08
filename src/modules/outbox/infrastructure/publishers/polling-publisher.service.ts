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

/**
 * Polling Publisher (microservices.io) — the half of the Transactional Outbox
 * that moves rows from PENDING to Kafka/queue. Stale-INFLIGHT recovery after a
 * publisher crash is a separate concern, handled by OutboxReaperService.
 */
@Injectable()
export class PollingPublisherService {
  private running = false
  private readonly maxAttempts: number
  private readonly pollBatchSize: number

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MESSAGE_PUBLISHER) private readonly publisher: IMessagePublisher,
    @InjectPinoLogger(PollingPublisherService.name) private readonly logger: PinoLogger,
    config: ConfigService,
  ) {
    this.maxAttempts = config.getOrThrow<number>('env.outboxMaxAttempts')
    this.pollBatchSize = config.getOrThrow<number>('env.outboxPollBatchSize')
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
            orgid: event.orgId,
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
}
