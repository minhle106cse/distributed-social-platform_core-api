import { Injectable } from '@nestjs/common'
import { Prisma } from '@/generated'
import type { ClaimedOutboxEvent, IOutboxStore } from '@distributed-social-platform/shared-kernel'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'

/**
 * Publisher side of the outbox — an ordinary singleton on the plain client.
 *
 * It must NOT participate in an application transaction: claiming holds row locks
 * and publishing performs Kafka network I/O, so joining a caller's transaction
 * would stretch those locks across the network. Previously that was guaranteed
 * only by a comment ("never called via getTx()"); now this class has no way to see
 * an ambient transaction at all, and the append path lives in a separate
 * `PrismaOutboxWriter` that is only reachable through a TxScope.
 *
 * It implements `IOutboxStore` (shared-kernel) for exactly the three methods
 * `OutboxPublisher` drives — and NOT for the other three. The story behind that
 * split, on one day (2026-08-24):
 *   1. `IOutboxDispatchRepository` + a DI token were DELETED: all four consumers
 *      (PollingPublisher, Reaper, Cleanup, MetricsReporter) were infrastructure,
 *      so the interface crossed no boundary — the same mistake
 *      `IIdempotencyRepository` was reverted for (resilience_patterns.md §6.1).
 *   2. A port came BACK for part of it, as `IOutboxStore`, the moment the publish
 *      loop moved into shared-kernel: its consumer now lives in another package,
 *      so a real boundary exists. The rule ("where are the consumers") never
 *      changed; the consumers moved.
 * `reapStaleInflight`/`countByStatus`/`purgeProcessed` stay OFF the port: their
 * callers (Reaper, MetricsReporter, Cleanup) are still infrastructure right here,
 * and each is a one-line delegation. Contrast `IOutboxWriter`, whose consumers are
 * Application-layer command handlers.
 */
@Injectable()
export class PrismaOutboxRepository implements IOutboxStore {
  constructor(private readonly prisma: PrismaService) {}

  async claimPendingBatch(limit: number): Promise<ClaimedOutboxEvent[]> {
    // FOR UPDATE SKIP LOCKED has no Prisma query-builder equivalent — this is
    // the one place raw SQL is unavoidable.
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

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await this.prisma.client.outboxEvent.groupBy({
      by: ['status'],
      _count: { _all: true },
    })
    // Zero-initialize every known status so a status with 0 rows still reports
    // 0 on the gauge instead of silently missing (PENDING=0 is a meaningful,
    // not absent, reading).
    const counts: Record<string, number> = { PENDING: 0, INFLIGHT: 0, PROCESSED: 0, FAILED_DLQ: 0 }
    for (const row of rows) counts[row.status] = row._count._all
    return counts
  }

  async purgeProcessed(olderThan: Date): Promise<number> {
    const { count } = await this.prisma.client.outboxEvent.deleteMany({
      where: { status: 'PROCESSED', processedAt: { lt: olderThan } },
    })
    return count
  }
}
