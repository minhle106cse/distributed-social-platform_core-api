import { Injectable } from '@nestjs/common'
import { getTx } from '@distributed-social-platform/shared-kernel'
import { Prisma } from '@/generated'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { CreditAccount } from '../../domain/aggregates/credit-account.aggregate'
import type {
  CreditEventType,
  CreditEventPayload,
  CreditLedgerEvent,
} from '../../domain/aggregates/credit-account.aggregate'
import type { ICreditEventRepository } from '../../domain/repositories/credit-event.repository'
import { CreditConcurrencyError } from '../../domain/credit.errors'

@Injectable()
export class PrismaCreditEventRepository implements ICreditEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get client(): Prisma.TransactionClient {
    return getTx<Prisma.TransactionClient>() ?? this.prisma.client
  }

  async loadOrOpen(orgId: string, userId: string): Promise<CreditAccount> {
    const aggregateId = CreditAccount.walletId(orgId, userId)
    const rows = await this.client.creditEvent.findMany({
      where: { aggregateId, orgId },
      orderBy: { version: 'asc' },
    })

    // Trust on read: rows were validated by the aggregate + DB constraints on write.
    const events: CreditLedgerEvent[] = rows.map((row) => ({
      aggregateId: row.aggregateId,
      orgId: row.orgId,
      userId: row.userId ?? userId,
      eventType: row.eventType as CreditEventType,
      version: row.version,
      payload: row.payload as unknown as CreditEventPayload,
    }))

    return CreditAccount.rehydrate(orgId, userId, events)
  }

  async save(account: CreditAccount): Promise<void> {
    const events = account.getUncommittedEvents()
    if (events.length === 0) return

    try {
      await this.client.creditEvent.createMany({
        data: events.map((event) => ({
          aggregateId: event.aggregateId,
          orgId: event.orgId,
          userId: event.userId,
          eventType: event.eventType,
          version: event.version,
          payload: event.payload as unknown as Prisma.InputJsonValue,
        })),
      })
    } catch (err) {
      // P2002 on @@unique([aggregateId, version]) = another writer claimed this version.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new CreditConcurrencyError()
      }
      throw err
    }
  }
}
