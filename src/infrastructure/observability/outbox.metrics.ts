import { Counter, Gauge } from 'prom-client'

/**
 * Makes the Transactional Outbox observable without opening the DB — before
 * this, `PENDING`/`INFLIGHT`/`FAILED_DLQ` counts were only visible via a
 * manual `SELECT status, COUNT(*) FROM outbox_events GROUP BY status`, and a
 * row crossing into permanent `FAILED_DLQ` logged the exact same line as any
 * other retryable failure. Registered on the prom-client default registry, so
 * they surface automatically on GET /metrics. Module-level singletons (Node
 * caches the module), so importing them anywhere yields the same instance —
 * no double-registration.
 */

// A row just crossed maxAttempts and became permanently FAILED_DLQ — distinct
// from a retryable failure (see PollingPublisherService). Any non-zero rate
// needs a human to look at the row (query by eventType/aggregateId).
export const outboxDeadLetterCounter = new Counter({
  name: 'core_api_outbox_dead_letter_total',
  help: 'Outbox rows that exhausted retry attempts and became permanently FAILED_DLQ',
  labelNames: ['eventType'] as const,
})

// Snapshot of current row counts per status, refreshed on an interval
// (OutboxMetricsReporter) — the live backlog/stuck/dead view that used to
// require a manual SQL query. A sustained PENDING climb means the publisher
// can't keep up; a non-zero INFLIGHT that never drops means claims are
// stalling; FAILED_DLQ here should track outboxDeadLetterCounter's total.
export const outboxBacklogGauge = new Gauge({
  name: 'core_api_outbox_backlog',
  help: 'Current outbox row count by status',
  labelNames: ['status'] as const,
})
