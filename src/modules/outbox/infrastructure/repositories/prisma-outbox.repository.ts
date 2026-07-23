import { Injectable } from '@nestjs/common'
import { Prisma } from '@/generated'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { getTx, getCurrentTraceparent } from '@distributed-social-platform/shared-kernel'
import type {
  ClaimedOutboxEvent,
  IOutboxRepository,
  OutboxAppendInput,
} from '../../domain/repositories/outbox.repository'

@Injectable()
export class PrismaOutboxRepository implements IOutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get client(): Prisma.TransactionClient {
    return getTx<Prisma.TransactionClient>() ?? this.prisma.client
  }

  async append(input: OutboxAppendInput): Promise<void> {
    await this.client.outboxEvent.create({
      data: {
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        eventType: input.eventType,
        orgId: input.orgId,
        payload: input.payload as Prisma.InputJsonValue,
        // Captured from ALS, not the caller — every command handler already
        // runs inside the trace context established at the HTTP entry point,
        // so no call site needs to thread this through explicitly.
        traceparent: getCurrentTraceparent() ?? null,
      },
    })
  }

  async claimPendingBatch(limit: number): Promise<ClaimedOutboxEvent[]> {
    // FOR UPDATE SKIP LOCKED has no Prisma query-builder equivalent — this is
    // the one place raw SQL is unavoidable. Runs OUTSIDE any app transaction
    // (never called via getTx()) so row locks never span the Kafka network I/O.
    const claimed = await this.prisma.client.$queryRaw<{ id: string }[]>(Prisma.sql`
      UPDATE outbox_events
      SET status = 'INFLIGHT'::"OutboxStatus", claimed_at = NOW()
      WHERE id IN (
        SELECT id FROM outbox_events
        WHERE status = 'PENDING'::"OutboxStatus"
        ORDER BY created_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id
    `)

    if (claimed.length === 0) return []

    const rows = await this.prisma.client.outboxEvent.findMany({
      where: { id: { in: claimed.map((r) => r.id) } },
      orderBy: { createdAt: 'asc' },
    })

    return rows.map((r) => ({
      id: r.id,
      aggregateType: r.aggregateType,
      aggregateId: r.aggregateId,
      eventType: r.eventType,
      orgId: r.orgId,
      payload: r.payload,
      attempts: r.attempts,
      createdAt: r.createdAt,
      traceparent: r.traceparent,
    }))
  }

  async markProcessed(id: string): Promise<void> {
    await this.prisma.client.outboxEvent.update({
      where: { id },
      data: { status: 'PROCESSED', processedAt: new Date(), claimedAt: null },
    })
  }

  async markFailed(
    id: string,
    currentAttempts: number,
    error: string,
    maxAttempts: number,
  ): Promise<void> {
    const nextAttempts = currentAttempts + 1
    const nextStatus = nextAttempts >= maxAttempts ? 'FAILED_DLQ' : 'PENDING'

    await this.prisma.client.outboxEvent.update({
      where: { id },
      data: { attempts: nextAttempts, lastError: error, status: nextStatus, claimedAt: null },
    })
  }

  async reapStaleInflight(claimTimeoutMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - claimTimeoutMs)
    const { count } = await this.prisma.client.outboxEvent.updateMany({
      where: { status: 'INFLIGHT', claimedAt: { lt: cutoff } },
      data: { status: 'PENDING', claimedAt: null },
    })
    return count
  }
}
