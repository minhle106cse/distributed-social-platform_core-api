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

/**
 * Write side of the Transactional Outbox: appending the event MUST commit with the
 * state change that produced it. Lives in every module's TxScope, so it is only
 * reachable from inside a transaction — the dual-write hole is closed by
 * construction rather than by remembering to set a flag.
 */
export interface IOutboxAppender {
  append(input: OutboxAppendInput): Promise<void>
}

/**
 * Publisher side, driven by PollingPublisherService. Deliberately NOT part of any
 * TxScope: claiming holds row locks and publishing does Kafka network I/O, so this
 * must run OUTSIDE an application transaction. That used to be a comment on the
 * implementation; splitting the interface makes it a fact about what a caller can
 * even reach (ADR-0001).
 */
export interface IOutboxDispatchRepository {
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

  /** Current row count per status — backs the outbox backlog gauge (OutboxMetricsReporter). */
  countByStatus(): Promise<Record<string, number>>

  /**
   * Delete PROCESSED rows older than `olderThan` — Postgres never expires a
   * row on its own (unlike Kafka topic retention), so without this the table
   * grows forever. Deliberately does NOT touch FAILED_DLQ rows — those need a
   * human to triage first (see eventing_patterns.md §4.1). Returns count deleted.
   */
  purgeProcessed(olderThan: Date): Promise<number>
}

export const OUTBOX_DISPATCH_REPOSITORY = Symbol('IOutboxDispatchRepository')
