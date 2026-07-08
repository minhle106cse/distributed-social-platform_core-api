import { InsufficientCreditsError, InvalidCreditAmountError } from '../credit.errors'

export type CreditEventType = 'CreditGranted' | 'CreditSpent' | 'CreditRefunded'

export interface CreditEventPayload {
  amount: number // always positive; direction implied by eventType
  reason: string
}

// A single ledger entry — the unit persisted to (and rehydrated from) credit_events.
export interface CreditLedgerEvent {
  aggregateId: string
  orgId: string
  userId: string
  eventType: CreditEventType
  version: number
  payload: CreditEventPayload
}

/**
 * Event-sourced credit wallet, scoped per-user-per-org.
 * Balance is folded from the event stream — no summary table (SoT-only).
 * OCC is enforced on save via @@unique([aggregateId, version]) on credit_events.
 */
export class CreditAccount {
  private readonly uncommitted: CreditLedgerEvent[] = []

  private constructor(
    private readonly _aggregateId: string,
    private readonly _orgId: string,
    private readonly _userId: string,
    private _version: number,
    private _balance: number,
  ) {}

  static walletId(orgId: string, userId: string): string {
    return `${orgId}:${userId}`
  }

  // A wallet that has never had an event — version 0, balance 0.
  static open(orgId: string, userId: string): CreditAccount {
    return new CreditAccount(CreditAccount.walletId(orgId, userId), orgId, userId, 0, 0)
  }

  // Replay the stored stream to reconstruct current state.
  static rehydrate(orgId: string, userId: string, events: CreditLedgerEvent[]): CreditAccount {
    const account = CreditAccount.open(orgId, userId)
    for (const event of events) account.apply(event)
    return account
  }

  // Source: org grants credits to a member (e.g. after buying a credit pack).
  grant(amount: number, reason: string): void {
    this.assertPositiveAmount(amount)
    this.raise('CreditGranted', amount, reason)
  }

  // Sink: member spends credits (AI query, premium feature, bounty stake).
  spend(amount: number, reason: string): void {
    this.assertPositiveAmount(amount)
    if (amount > this._balance) throw new InsufficientCreditsError(this._balance, amount)
    this.raise('CreditSpent', amount, reason)
  }

  // Compensation primitive: return previously-spent credits (used by the AI-Query Saga).
  refund(amount: number, reason: string): void {
    this.assertPositiveAmount(amount)
    this.raise('CreditRefunded', amount, reason)
  }

  private assertPositiveAmount(amount: number): void {
    if (!Number.isInteger(amount) || amount <= 0) throw new InvalidCreditAmountError()
  }

  private raise(eventType: CreditEventType, amount: number, reason: string): void {
    const event: CreditLedgerEvent = {
      aggregateId: this._aggregateId,
      orgId: this._orgId,
      userId: this._userId,
      eventType,
      version: this._version + 1,
      payload: { amount, reason },
    }
    this.apply(event)
    this.uncommitted.push(event)
  }

  private apply(event: CreditLedgerEvent): void {
    this._version = event.version
    switch (event.eventType) {
      case 'CreditGranted':
      case 'CreditRefunded':
        this._balance += event.payload.amount
        break
      case 'CreditSpent':
        this._balance -= event.payload.amount
        break
    }
  }

  get aggregateId(): string {
    return this._aggregateId
  }

  get balance(): number {
    return this._balance
  }

  get version(): number {
    return this._version
  }

  getUncommittedEvents(): CreditLedgerEvent[] {
    return [...this.uncommitted]
  }
}
