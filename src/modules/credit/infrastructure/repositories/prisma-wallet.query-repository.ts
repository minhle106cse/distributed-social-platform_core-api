import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { CreditAccount } from '../../domain/entities/credit-account.aggregate'
import type { IWalletQueryRepository } from '../../application/repositories/wallet.query-repository'
import type { WalletDto, WalletLedgerEntryDto } from '../../application/queries/wallet.dto'
import { CreditEventMapper } from '../mappers/credit-event.mapper'

@Injectable()
export class PrismaWalletQueryRepository implements IWalletQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ⚠️ This fold is a SECOND implementation of CreditAccount.apply() — a
   * pre-existing debt of the SoT-only design (no summary table, so the read side
   * cannot just SELECT a balance). Any new event type must be added in BOTH
   * places or the wallet endpoint quietly disagrees with the aggregate that
   * authorizes spending. Kept honest by the cross-check test in
   * credit-account.aggregate.spec.ts, which runs one event stream through both
   * and asserts identical balance/available/reserved.
   */
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
    // reservationId → amount still held. Deleted on commit/release rather than
    // status-tracked: unlike the aggregate, the read side never has to tell
    // "already committed" from "never existed" — it only reports the open total.
    const openReservations = new Map<string, number>()

    for (const row of rows) {
      const { amount, reservationId } = CreditEventMapper.decodePayload(row.payload)
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
        // A hold: balance untouched, `available` shrinks.
        case 'CreditReserved':
          if (reservationId !== undefined) openReservations.set(reservationId, amount)
          break
        // The charge lands here — and counts as spend for the totals, since from
        // the user's point of view a committed reservation IS a spend.
        case 'CreditReservationCommitted':
          balance -= amount
          totalSpent += amount
          if (reservationId !== undefined) openReservations.delete(reservationId)
          break
        // Never charged, so it moves neither balance nor totalSpent/totalRefunded.
        case 'CreditReservationReleased':
          if (reservationId !== undefined) openReservations.delete(reservationId)
          break
      }
    }

    let reserved = 0
    for (const amount of openReservations.values()) reserved += amount

    // Newest entries first, bounded to recentLimit.
    const entries: WalletLedgerEntryDto[] = rows
      .slice(-recentLimit)
      .reverse()
      .map((row) => {
        const { amount, reason } = CreditEventMapper.decodePayload(row.payload)
        return {
          eventType: row.eventType,
          delta: walletDelta(row.eventType, amount),
          reason,
          version: row.version,
          occurredAt: row.createdAt.toISOString(),
        }
      })

    return {
      orgId,
      userId,
      balance,
      available: balance - reserved,
      reserved,
      totalGranted,
      totalSpent,
      totalRefunded,
      entries,
    }
  }
}

// Signed effect on BALANCE for one ledger row. Reserved/Released are 0 on purpose:
// they are visible in the ledger (the user should see the hold happen and be
// released) but neither moves money, so showing them as ±amount would make the
// entries stop summing to the balance.
function walletDelta(eventType: string, amount: number): number {
  switch (eventType) {
    case 'CreditSpent':
    case 'CreditReservationCommitted':
      return -amount
    case 'CreditGranted':
    case 'CreditRefunded':
      return amount
    default:
      return 0
  }
}
