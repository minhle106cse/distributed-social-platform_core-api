import { Injectable } from '@nestjs/common'
import type {
  ISagaCompensationStore,
  CompensationAction,
} from '@distributed-social-platform/shared-kernel'
import { Prisma } from '@/generated'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import type {
  ClaimedSagaCompensation,
  ISagaCompensationDispatchRepository,
} from './saga-compensation.repository'

/**
 * Both halves of the saga compensation store on the plain client — unlike
 * Outbox, neither half needs a TxScope: `recordFailed` runs from inside
 * `CommandBus.runSaga`'s catch block, which (by construction — sagas hold no
 * `tx`) is never inside a transaction, and claiming/running here is the exact
 * same "must run OUTSIDE any application transaction" requirement Outbox's
 * dispatch side already has. One class, one file — the split that matters for
 * Outbox (append-in-tx vs dispatch-outside-tx) doesn't apply here.
 */
@Injectable()
export class PrismaSagaCompensationRepository
  implements ISagaCompensationStore, ISagaCompensationDispatchRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async recordFailed(
    sagaCommand: string,
    action: CompensationAction,
    error: unknown,
  ): Promise<void> {
    await this.prisma.client.sagaCompensation.create({
      data: {
        sagaCommand,
        actionType: action.type,
        payload: action.payload as Prisma.InputJsonValue,
        lastError: error instanceof Error ? error.message : String(error),
      },
    })
  }

  async claimPendingBatch(limit: number): Promise<ClaimedSagaCompensation[]> {
    // FOR UPDATE SKIP LOCKED has no Prisma query-builder equivalent — same
    // reasoning as PrismaOutboxRepository.claimPendingBatch.
    const claimed = await this.prisma.client.$queryRaw<{ id: string }[]>(Prisma.sql`
      UPDATE saga_compensations
      SET status = 'INFLIGHT'::"SagaCompensationStatus", claimed_at = NOW()
      WHERE id IN (
        SELECT id FROM saga_compensations
        WHERE status = 'PENDING'::"SagaCompensationStatus"
        ORDER BY created_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id
    `)

    if (claimed.length === 0) return []

    const rows = await this.prisma.client.sagaCompensation.findMany({
      where: { id: { in: claimed.map((r) => r.id) } },
      orderBy: { createdAt: 'asc' },
    })

    return rows.map((r) => ({
      id: r.id,
      sagaCommand: r.sagaCommand,
      actionType: r.actionType,
      payload: r.payload,
      attempts: r.attempts,
      createdAt: r.createdAt,
    }))
  }

  async markProcessed(id: string): Promise<void> {
    await this.prisma.client.sagaCompensation.update({
      where: { id },
      data: { status: 'DONE', processedAt: new Date(), claimedAt: null },
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

    await this.prisma.client.sagaCompensation.update({
      where: { id },
      data: { attempts: nextAttempts, lastError: error, status: nextStatus, claimedAt: null },
    })
  }

  async reapStaleInflight(claimTimeoutMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - claimTimeoutMs)
    const { count } = await this.prisma.client.sagaCompensation.updateMany({
      where: { status: 'INFLIGHT', claimedAt: { lt: cutoff } },
      data: { status: 'PENDING', claimedAt: null },
    })
    return count
  }

  async purgeProcessed(olderThan: Date): Promise<number> {
    const { count } = await this.prisma.client.sagaCompensation.deleteMany({
      where: { status: 'DONE', processedAt: { lt: olderThan } },
    })
    return count
  }
}
