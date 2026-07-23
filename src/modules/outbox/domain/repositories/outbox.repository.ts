export interface OutboxAppendInput {
  eventType: string
  aggregateType: string
  aggregateId: string
  orgId: string
  payload: unknown
}

export interface ClaimedOutboxEvent {
  id: string
  aggregateType: string
  aggregateId: string
  eventType: string
  orgId: string
  payload: unknown
  attempts: number
  createdAt: Date
  traceparent: string | null
}

export interface IOutboxRepository {
  append(input: OutboxAppendInput): Promise<void>

  /**
   * Atomically flips up to `limit` PENDING rows to INFLIGHT (HA-safe under
   * concurrent publisher replicas) and returns them for publishing. Driving
   * services (PollingPublisherService) never touch the DB directly — this is
   * the one place the claim algorithm lives, so swapping the ORM/DB only
   * requires reimplementing this method, not rediscovering the algorithm.
   */
  claimPendingBatch(limit: number): Promise<ClaimedOutboxEvent[]>

  /** A claimed row was published successfully. */
  markProcessed(id: string): Promise<void>

  /** A claimed row failed to publish — bump attempts, DLQ if budget exhausted. */
  markFailed(id: string, currentAttempts: number, error: string, maxAttempts: number): Promise<void>

  /** Return INFLIGHT rows claimed longer than claimTimeoutMs ago back to PENDING. Returns count reaped. */
  reapStaleInflight(claimTimeoutMs: number): Promise<number>
}

export const OUTBOX_REPOSITORY = Symbol('IOutboxRepository')
