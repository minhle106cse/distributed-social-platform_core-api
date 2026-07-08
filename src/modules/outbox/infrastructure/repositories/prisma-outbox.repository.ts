import { Injectable } from '@nestjs/common'
import type { Prisma } from '@/generated'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { getTx } from '@distributed-social-platform/shared-kernel'
import type {
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
      },
    })
  }
}
