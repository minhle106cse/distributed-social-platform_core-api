import { Counter, Gauge } from 'prom-client'

/**
 * Live health for background jobs — replaces the in-memory tracking
 * ScheduledJobRegistry originally had. That was wrong for this app's own
 * assumptions: every job here already assumes multiple replicas can run
 * concurrently (see resilience_patterns.md §6 — "HA-safe claim", `FOR UPDATE
 * SKIP LOCKED`), so per-process RAM state gave a different, incomplete answer
 * depending on which replica happened to answer GET /jobs, and required a
 * human to remember to poll it. Prometheus already scrapes every replica on
 * its own schedule and survives app restarts — same mechanism as
 * outbox.metrics.ts, correct per-replica via the `job` label instead of
 * silently overwritten.
 */

export const scheduledJobLastSuccessGauge = new Gauge({
  name: 'core_api_scheduled_job_last_success_timestamp_seconds',
  help: 'Unix timestamp of the last successful run of a scheduled job',
  labelNames: ['job'] as const,
})

export const scheduledJobLastFailureGauge = new Gauge({
  name: 'core_api_scheduled_job_last_failure_timestamp_seconds',
  help: 'Unix timestamp of the last failed run of a scheduled job',
  labelNames: ['job'] as const,
})

export const scheduledJobFailuresCounter = new Counter({
  name: 'core_api_scheduled_job_failures_total',
  help: 'Total failed ticks of a scheduled job',
  labelNames: ['job'] as const,
})

/**
 * "Info metric" pattern (same idea as kube_pod_info/node_uname_info) — value
 * is always 1, the actual content lives in the labels. Set once at
 * `register()` time. Replaces a separate GET /jobs REST endpoint: nothing
 * automated ever called it (Prometheus scrapes /metrics, not arbitrary JSON
 * routes) and a human wouldn't curl it either when the code/doc table is
 * right there — folding "what jobs exist" into the same scraped source Grafana
 * already reads means it can be joined against the health gauges above in one
 * dashboard/query instead of living in a disconnected system nobody queries.
 */
export const scheduledJobInfoGauge = new Gauge({
  name: 'core_api_scheduled_job_info',
  help: 'Static metadata for a registered scheduled job (value always 1) — schedule/file/purpose as labels',
  labelNames: ['job', 'schedule', 'file', 'purpose'] as const,
})
