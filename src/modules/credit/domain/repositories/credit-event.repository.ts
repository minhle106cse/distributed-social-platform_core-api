import type { CreditAccount } from '../aggregates/credit-account.aggregate'

export interface ICreditEventRepository {
  // Load a wallet by folding its event stream. Returns an empty wallet (version 0)
  // if no events exist yet — a wallet is implicit, there is no provisioning step.
  loadOrOpen(orgId: string, userId: string): Promise<CreditAccount>
  // Append uncommitted events atomically. Throws CreditConcurrencyError on version clash.
  save(account: CreditAccount): Promise<void>
}

export const CREDIT_EVENT_REPOSITORY = Symbol('ICreditEventRepository')
