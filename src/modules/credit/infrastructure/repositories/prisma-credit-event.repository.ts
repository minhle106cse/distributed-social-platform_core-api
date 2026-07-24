import { Injectable } from '@nestjs/common'
import { getTx } from '@distributed-social-platform/shared-kernel'
import { Prisma } from '@/generated'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { CreditAccount } from '../../domain/entities/credit-account.aggregate'
import type { CreditLedgerEvent } from '../../domain/entities/credit-account.aggregate'
import type { ICreditEventRepository } from '../../domain/repositories/credit-event.repository'
import { CreditConcurrencyError } from '../../domain/credit.errors'
import { CreditEventMapper } from '../mappers/credit-event.mapper'

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
    const events: CreditLedgerEvent[] = rows.map((row) => CreditEventMapper.toDomain(row))

    return CreditAccount.rehydrate(orgId, userId, events)
  }

  async save(account: CreditAccount): Promise<void> {
    const events = account.getUncommittedEvents()
    if (events.length === 0) return

    try {
      await this.client.creditEvent.createMany({
        data: events.map((event) => CreditEventMapper.toPersistence(event)),
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
