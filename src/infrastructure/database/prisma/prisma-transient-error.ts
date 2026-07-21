import { Prisma } from '@prisma/client'
import { Counter } from 'prom-client'

/**
 * Infra-layer predicate that classifies Prisma errors as transient (retryable).
 * Injected into RetryMiddleware so the middleware itself stays ORM-agnostic.
 *
 * Only P2034 (write conflict / deadlock) is retried: the losing transaction is
 * aborted by Postgres and typically resolves within milliseconds — retry here is
 * the standard, low-risk remediation (Prisma docs recommend it).
 *
 * P2028 (transaction/connection API error) is DELIBERATELY EXCLUDED (2026-07-14,
 * resilience_patterns.md §3) — it can signal connection-pool exhaustion, not a
 * momentary blip. Auto-retrying it re-requests a connection from the SAME
 * exhausted pool: a retry-storm antipattern that adds load during the exact
 * window the pool needs it to drain, potentially prolonging the outage instead
 * of recovering from it. Letting it fail fast surfaces a real 5xx to the client
 * instead of silently compounding pressure server-side. See prisma-metrics for
 * observed frequency before reconsidering.
 */
export function isPrismaTransientError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2034'
  }
  return false
}

/**
 * Observes every P-code error caught on a retryable command, independent of
 * whether it was actually auto-retried — including P2028, now excluded from
 * `isPrismaTransientError` above. Lets the "stop auto-retrying P2028" call be
 * revisited with real frequency data instead of a guess. Wired as
 * `RetryMiddleware`'s `onError` hook at the composition root.
 */
export const dbTransientErrorCounter = new Counter({
  name: 'core_api_db_transient_error_total',
  help: 'Prisma errors observed on retryable commands, by code and whether auto-retried',
  labelNames: ['code', 'retried'] as const,
})

export function recordDbTransientErrorObservation(error: unknown, retried: boolean): void {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    dbTransientErrorCounter.inc({ code: error.code, retried: String(retried) })
  }
}
