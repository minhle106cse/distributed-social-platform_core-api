import {
  ApplicationError,
  type MarkedTransientError,
} from '@distributed-social-platform/shared-kernel'

// Thrown by the CreditAccount aggregate when a spend/reserve exceeds AVAILABLE
// credit (balance minus open reservations — not raw balance, see the aggregate).
//
// 402, not 409 (changed 2026-08-22, Phase 5b): docs/06_api_contracts.md has
// promised `402 INSUFFICIENT_CREDIT` since the contract was written, and 402
// Payment Required is what "you are out of credit" actually means — 409 says
// "your view of the state is stale, retry", which is a different instruction to
// the client and is already what CreditConcurrencyError below correctly returns.
// Also changes the existing POST /credits/spend response; accepted deliberately
// (pre-production, and the two errors were indistinguishable by status before).
export class InsufficientCreditsError extends ApplicationError {
  readonly statusCode = 402
  readonly code = 'INSUFFICIENT_CREDITS'

  constructor(available: number, requested: number) {
    super('Insufficient credits for this operation', { available, requested })
  }
}

// Commit/release ran against a reservation that isn't OPEN. Only commit throws it
// — release treats the same situation as a no-op on purpose (it is a compensation
// and gets retried; see CreditAccount.releaseReservation).
export class ReservationNotOpenError extends ApplicationError {
  readonly statusCode = 409
  readonly code = 'RESERVATION_NOT_OPEN'

  constructor(reservationId: string, status: string) {
    super('Credit reservation is not open', { reservationId, status })
  }
}

// The RAG pipeline retrieved context but could not produce an answer (summarizer
// down / circuit open). The user did not receive what they would have been
// charged for, so the saga releases the hold and this surfaces as 503 with the
// retrieved chunks as a fallback (UC-C2 error path).
export class AiUnavailableError extends ApplicationError {
  readonly statusCode = 503
  readonly code = 'AI_UNAVAILABLE'

  // Carries the retrieved chunks as `details` so the 503 still gives the user
  // something usable instead of just an apology — UC-C2 error path asks for the
  // search results plus the notice. Trimmed by the caller, not shipped whole.
  constructor(fallbackChunks: Array<{ knowledgeItemId: string; title: string; snippet: string }>) {
    super('AI summarization is temporarily unavailable; you were not charged', {
      fallbackChunks,
    })
  }
}

// Business invariant: credit amounts are always positive integers.
export class InvalidCreditAmountError extends ApplicationError {
  readonly statusCode = 400
  readonly code = 'INVALID_CREDIT_AMOUNT'

  constructor() {
    super('Credit amount must be a positive integer')
  }
}

// Raised when two writers append the same aggregate version concurrently (OCC).
// Mirrors KnowledgeVersionConflictError — the client should retry with fresh state.
export class CreditConcurrencyError extends ApplicationError implements MarkedTransientError {
  readonly statusCode = 409
  readonly code = 'CREDIT_CONCURRENCY_CONFLICT'
  // Safe to auto-retry: the write that hit P2002 on @@unique([aggregateId,
  // version]) already rolled back (nothing committed), and loadOrOpen() re-reads
  // the stream at the new version on the next attempt — the same shape as a
  // Prisma P2034 serialization conflict, just detected at the application layer
  // instead of by Postgres. CommandBus.withRetry recognizes this marker the same
  // way it recognizes P2034 (review of ADR-0001, 2026-07-30 — previously every
  // concurrent spend/grant/refund surfaced a 409 to the client even though a
  // single re-run would routinely have succeeded).
  readonly transient = true as const

  constructor() {
    super('Wallet was modified by another request; retry the operation')
  }
}
