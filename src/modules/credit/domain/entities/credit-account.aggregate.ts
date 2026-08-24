import {
  InsufficientCreditsError,
  InvalidCreditAmountError,
  ReservationNotOpenError,
} from '../credit.error'

export type CreditEventType =
  | 'CreditGranted'
  | 'CreditSpent'
  | 'CreditRefunded'
  // Two-phase reserve (Phase 5b). A hold, not a charge: the AI-Query Saga must be
  // able to fail without the user's balance ever having moved, so the ledger
  // records Reserved → Committed (charged) or Reserved → Released (never charged)
  // instead of Spent → Refunded (charged, then given back). One event pair either
  // way, but only this shape keeps `balance` monotone w.r.t. real spending.
  | 'CreditReserved'
  | 'CreditReservationCommitted'
  | 'CreditReservationReleased'

export interface CreditEventPayload {
  amount: number // always positive; direction implied by eventType
  reason: string
  // Set on the three reservation events; absent on grant/spend/refund.
  reservationId?: string
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

export type ReservationStatus = 'OPEN' | 'COMMITTED' | 'RELEASED'

interface ReservationState {
  amount: number
  status: ReservationStatus
}

/**
 * Event-sourced credit wallet, scoped per-user-per-org.
 * Balance is folded from the event stream — no summary table (SoT-only).
 * OCC is enforced on save via @@unique([aggregateId, version]) on credit_events.
 *
 * Two balances, and the difference is the whole point of Phase 5b:
 *   - `balance`   — credits actually owned. Only Granted/Refunded/Committed move it.
 *   - `available` — `balance` minus everything held by OPEN reservations. This is
 *                   what every spend/reserve check compares against; comparing
 *                   against `balance` lets two concurrent operations each see the
 *                   full balance and collectively overdraw it. OCC catches two
 *                   writers at the same VERSION — it cannot catch this.
 */
export class CreditAccount {
  private readonly uncommitted: CreditLedgerEvent[] = []
  // Keyed by reservationId, holding the LAST state of each — not just the open
  // ones. releaseReservation() has to tell "never existed" from "already
  // committed/released" to stay idempotent, and a map of only-open reservations
  // collapses those two into the same answer.
  private readonly _reservations = new Map<string, ReservationState>()

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

  // Sink: member spends credits directly (POST /credits/spend — no saga involved).
  // Checks `available`, NOT `_balance`: credits already held by an in-flight AI
  // query are not the user's to spend a second time.
  spend(amount: number, reason: string): void {
    this.assertPositiveAmount(amount)
    if (amount > this.available) throw new InsufficientCreditsError(this.available, amount)
    this.raise('CreditSpent', amount, reason)
  }

  // Compensation primitive for a completed spend (kept for direct spends; the
  // AI-Query Saga uses releaseReservation instead — nothing was charged there).
  refund(amount: number, reason: string): void {
    this.assertPositiveAmount(amount)
    this.raise('CreditRefunded', amount, reason)
  }

  // Phase 1 of the two-phase spend: hold `amount` without charging it.
  reserve(reservationId: string, amount: number, reason: string): void {
    this.assertPositiveAmount(amount)
    if (amount > this.available) throw new InsufficientCreditsError(this.available, amount)
    this.raise('CreditReserved', amount, reason, reservationId)
  }

  // Phase 2a: the work the hold was for succeeded — charge it for real.
  commitReservation(reservationId: string, reason: string): void {
    const reservation = this._reservations.get(reservationId)
    if (!reservation || reservation.status !== 'OPEN') {
      throw new ReservationNotOpenError(reservationId, reservation?.status ?? 'UNKNOWN')
    }
    this.raise('CreditReservationCommitted', reservation.amount, reason, reservationId)
  }

  /**
   * Phase 2b: the work failed — free the hold. Returns whether it actually did
   * anything, so the caller knows whether there is an event worth saving.
   *
   * MUST be idempotent, and this is the most dangerous method in the module: it is
   * a saga compensation, so `SagaCompensationReaperService` re-runs it from durable
   * storage after a failure, and the expired-reservation sweeper can race with that.
   * Raising an event on an already-COMMITTED reservation would hand back credits
   * that were legitimately charged; raising one on an already-RELEASED reservation
   * double-counts a hold that was never a charge. Both break Phase 5's
   * `Sum(events) == Balance` acceptance criterion, and both do it silently.
   * So: not OPEN → no event, return false.
   */
  releaseReservation(reservationId: string, reason: string): boolean {
    const reservation = this._reservations.get(reservationId)
    if (!reservation || reservation.status !== 'OPEN') return false
    this.raise('CreditReservationReleased', reservation.amount, reason, reservationId)
    return true
  }

  private assertPositiveAmount(amount: number): void {
    if (!Number.isInteger(amount) || amount <= 0) throw new InvalidCreditAmountError()
  }

  private raise(
    eventType: CreditEventType,
    amount: number,
    reason: string,
    reservationId?: string,
  ): void {
    const event: CreditLedgerEvent = {
      aggregateId: this._aggregateId,
      orgId: this._orgId,
      userId: this._userId,
      eventType,
      version: this._version + 1,
      payload: reservationId === undefined ? { amount, reason } : { amount, reason, reservationId },
    }
    this.apply(event)
    this.uncommitted.push(event)
  }

  private apply(event: CreditLedgerEvent): void {
    this._version = event.version
    const { amount, reservationId } = event.payload
    switch (event.eventType) {
      case 'CreditGranted':
      case 'CreditRefunded':
        this._balance += amount
        break
      case 'CreditSpent':
        this._balance -= amount
        break
      // A hold moves nothing — it only shrinks `available` (see the getter).
      case 'CreditReserved':
        this.setReservation(reservationId, { amount, status: 'OPEN' })
        break
      // The charge happens HERE, not at reserve time.
      case 'CreditReservationCommitted':
        this._balance -= amount
        this.setReservation(reservationId, { amount, status: 'COMMITTED' })
        break
      // Nothing to give back: the hold never left the balance.
      case 'CreditReservationReleased':
        this.setReservation(reservationId, { amount, status: 'RELEASED' })
        break
    }
  }

  // A reservation event without a reservationId is a corrupt row (the aggregate
  // never writes one). Skipping it beats folding it under a bogus shared key,
  // which would make every other such row collide with it.
  private setReservation(reservationId: string | undefined, state: ReservationState): void {
    if (reservationId === undefined) return
    this._reservations.set(reservationId, state)
  }

  get aggregateId(): string {
    return this._aggregateId
  }

  get balance(): number {
    return this._balance
  }

  // Credits currently held by in-flight reservations.
  get reserved(): number {
    let total = 0
    for (const reservation of this._reservations.values()) {
      if (reservation.status === 'OPEN') total += reservation.amount
    }
    return total
  }

  // What the user can actually commit to something new.
  get available(): number {
    return this._balance - this.reserved
  }

  reservationStatus(reservationId: string): ReservationStatus | undefined {
    return this._reservations.get(reservationId)?.status
  }

  // The amount a reservation holds (or held). Callers that just released one need
  // it for the outbox payload — the command only carries the reservationId, since
  // the amount is the aggregate's to know, not the caller's to restate.
  reservationAmount(reservationId: string): number | undefined {
    return this._reservations.get(reservationId)?.amount
  }

  get version(): number {
    return this._version
  }

  getUncommittedEvents(): CreditLedgerEvent[] {
    return [...this.uncommitted]
  }
}
