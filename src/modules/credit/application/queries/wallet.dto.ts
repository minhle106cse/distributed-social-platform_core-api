export interface WalletLedgerEntryDto {
  eventType: string
  // Signed effect on BALANCE: +granted/+refunded, −spent/−reservation-committed,
  // 0 for the reserve/release pair (a hold never moves money).
  delta: number
  reason: string
  version: number
  occurredAt: string
}

export interface WalletDto {
  orgId: string
  userId: string
  // Credits owned. Includes anything currently held by an in-flight AI query.
  balance: number
  // What can actually be spent right now: balance − reserved. This, not
  // `balance`, is what the aggregate checks a spend against (Phase 5b).
  available: number
  // Held by OPEN reservations (in-flight AI queries) — not yet charged.
  reserved: number
  totalGranted: number
  totalSpent: number
  totalRefunded: number
  // Most recent ledger entries first (bounded — see GetWalletHandler).
  entries: WalletLedgerEntryDto[]
}
