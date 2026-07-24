import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { CreditAccount } from '../../domain/entities/credit-account.aggregate'
import type { IWalletQueryRepository } from '../../application/queries/wallet.query-repository'
import type { WalletDto, WalletLedgerEntryDto } from '../../application/queries/wallet.dto'
import { CreditEventMapper } from '../mappers/credit-event.mapper'

@Injectable()
export class PrismaWalletQueryRepository implements IWalletQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(orgId: string, userId: string, recentLimit: number): Promise<WalletDto> {
    const aggregateId = CreditAccount.walletId(orgId, userId)
    const rows = await this.prisma.client.creditEvent.findMany({
      where: { aggregateId, orgId },
      orderBy: { version: 'asc' },
    })

    let balance = 0
    let totalGranted = 0
    let totalSpent = 0
    let totalRefunded = 0

    for (const row of rows) {
      const { amount } = CreditEventMapper.decodePayload(row.payload)
      switch (row.eventType) {
        case 'CreditGranted':
          balance += amount
          totalGranted += amount
          break
        case 'CreditRefunded':
          balance += amount
          totalRefunded += amount
          break
        case 'CreditSpent':
          balance -= amount
          totalSpent += amount
          break
      }
    }

    // Newest entries first, bounded to recentLimit.
    const entries: WalletLedgerEntryDto[] = rows
      .slice(-recentLimit)
      .reverse()
      .map((row) => {
        const { amount, reason } = CreditEventMapper.decodePayload(row.payload)
        return {
          eventType: row.eventType,
          delta: row.eventType === 'CreditSpent' ? -amount : amount,
          reason,
          version: row.version,
          occurredAt: row.createdAt.toISOString(),
        }
      })

    return { orgId, userId, balance, totalGranted, totalSpent, totalRefunded, entries }
  }
}
