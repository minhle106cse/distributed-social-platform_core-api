import { makePrismaTransientErrorHelpers } from '@distributed-social-platform/shared-kernel'

/**
 * core-api's transient-error classification + observability, built from the
 * shared factory (shared-kernel) instead of a byte-for-byte copy of the
 * predicate/metric that used to live independently in every service (review of
 * ADR-0001, 2026-07-30). See `makePrismaTransientErrorHelpers`'s doc for the
 * reasoning: retry P2034, deliberately exclude P2028
 * (resilience_patterns.md §3), and why the observability counter only tracks
 * those two codes instead of every Prisma error.
 */
const helpers = makePrismaTransientErrorHelpers({ metricPrefix: 'core_api' })

// Named separately for direct unit-testing (prisma-transient-error.spec.ts) and
// for CommandBus wiring — `transientError` IS `{ isTransient, recordObservation }`,
// so callers that just need to construct a CommandBus use that one export instead
// of re-assembling an object from these two every time.
export const isPrismaTransientError = helpers.isTransient
export const recordDbTransientErrorObservation = helpers.recordObservation
export const transientError = helpers
