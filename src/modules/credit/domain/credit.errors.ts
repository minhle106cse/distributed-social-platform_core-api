import {
  ApplicationError,
  type MarkedTransientError,
} from '@distributed-social-platform/shared-kernel'

// Thrown by the CreditAccount aggregate when a spend exceeds the available balance.
export class InsufficientCreditsError extends ApplicationError {
  readonly statusCode = 409
  readonly code = 'INSUFFICIENT_CREDITS'

  constructor(balance: number, requested: number) {
    super('Insufficient credits for this operation', { balance, requested })
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
