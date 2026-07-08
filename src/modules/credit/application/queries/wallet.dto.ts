export interface WalletLedgerEntryDto {
  eventType: string
  delta: number // signed: +granted/+refunded, −spent
  reason: string
  version: number
  occurredAt: string
}

export interface WalletDto {
  orgId: string
  userId: string
  balance: number
  totalGranted: number
  totalSpent: number
  totalRefunded: number
  // Most recent ledger entries first (bounded — see GetWalletHandler).
  entries: WalletLedgerEntryDto[]
}
