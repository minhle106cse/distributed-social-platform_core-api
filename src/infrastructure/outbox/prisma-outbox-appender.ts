import { Prisma } from '@/generated'
import { getCurrentTraceparent } from '@distributed-social-platform/shared-kernel'
import type { IOutboxAppender, OutboxAppendInput } from './outbox.repository'

/**
 * Write side of the outbox. Built per-transaction by each module's TxScope factory,
 * so an append always commits together with the state change that produced it.
 */
export class PrismaOutboxAppender implements IOutboxAppender {
  constructor(private readonly client: Prisma.TransactionClient) {}

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
}
