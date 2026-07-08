import { ApplicationError } from '@distributed-social-platform/shared-kernel'

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
export class CreditConcurrencyError extends ApplicationError {
  readonly statusCode = 409
  readonly code = 'CREDIT_CONCURRENCY_CONFLICT'

  constructor() {
    super('Wallet was modified by another request; retry the operation')
  }
}
