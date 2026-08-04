export interface ClaimedSagaCompensation {
  id: string
  sagaCommand: string
  actionType: string
  payload: unknown
  attempts: number
  createdAt: Date
}

/**
 * Reaper side of the saga compensation store — claim/run/mark, the same shape
 * as `IOutboxDispatchRepository` (apps/core-api/src/infrastructure/outbox). Separate
 * from `ISagaCompensationStore` (shared-kernel, `CommandBus`'s write side)
 * because the reaper is a driving adapter with its own algorithm (claim batch,
 * mark processed/failed, reap stale claims) that has nothing to do with
 * `CommandBus`'s concerns.
 */
export interface ISagaCompensationDispatchRepository {
  claimPendingBatch(limit: number): Promise<ClaimedSagaCompensation[]>
  markProcessed(id: string): Promise<void>
  markFailed(id: string, currentAttempts: number, error: string, maxAttempts: number): Promise<void>
  /** Return INFLIGHT rows claimed longer than claimTimeoutMs ago back to PENDING. Returns count reaped. */
  reapStaleInflight(claimTimeoutMs: number): Promise<number>

  /**
   * Delete DONE rows older than `olderThan` — same reasoning as
   * `IOutboxDispatchRepository.purgeProcessed`. Deliberately does NOT touch
   * FAILED_DLQ rows — those need a human to triage first. Returns count deleted.
   */
  purgeProcessed(olderThan: Date): Promise<number>
}

export const SAGA_COMPENSATION_DISPATCH_REPOSITORY = Symbol('ISagaCompensationDispatchRepository')
