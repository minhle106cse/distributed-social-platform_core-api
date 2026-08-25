import { z } from 'zod'

export const envValidationSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORE_API_PORT: z.coerce.number().default(4002),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3001'),
  CORE_DATABASE_URL: z.string().url(),
  // Redis — cache backing shared-kernel's ICacheStore port. Default matches
  // docker-compose's redis service. A cache miss (or an unreachable Redis) is
  // never fatal: the adapter degrades to a miss and the source is re-queried.
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  JWT_PUBLIC_KEY: z.string().min(100),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  CORE_KAFKA_CLIENT_ID: z.string().default('core-api'),
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  OUTBOX_POLL_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(50),
  OUTBOX_CLAIM_TIMEOUT_MS: z.coerce.number().int().min(1000).default(60000),
  // Nightly cleanup (2026-07-31) — PROCESSED rows have no other retention
  // (unlike Kafka topics, Postgres never expires a row on its own); without
  // this the table grows unbounded forever. FAILED_DLQ rows are NEVER purged
  // by this job — they need a human to triage first (see eventing_patterns.md
  // §4.1), only successfully-completed rows are safe to delete on a timer.
  OUTBOX_PURGE_RETENTION_DAYS: z.coerce.number().int().min(1).default(30),

  // Saga compensation reaper (review of ADR-0001, 2026-07-30) — retries a
  // compensation step (e.g. cancel-provisioned-user) that failed on its first
  // attempt. Same shape as the outbox settings above on purpose.
  SAGA_COMPENSATION_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  SAGA_COMPENSATION_POLL_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(20),
  SAGA_COMPENSATION_CLAIM_TIMEOUT_MS: z.coerce.number().int().min(1000).default(60000),
  // Nightly cleanup, same reasoning as OUTBOX_PURGE_RETENTION_DAYS — only DONE
  // rows are purged, FAILED_DLQ stays for manual triage.
  SAGA_COMPENSATION_PURGE_RETENTION_DAYS: z.coerce.number().int().min(1).default(30),

  // gRPC client target for auth-service's internal AuthProvisioning service
  // (platform-admin org provisioning). Shared secret must match auth-service's.
  AUTH_GRPC_URL: z.string().default('localhost:50051'),
  // gRPC client target for search-service'''s internal RagQuery service — the paid
  // RAG path of the AI-Query Saga (Phase 5b). Same shared secret as above.
  SEARCH_GRPC_URL: z.string().default('localhost:50054'),
  INTERNAL_GRPC_SHARED_SECRET: z.string().min(16),

  // gRPC server port for core-api's own internal MembershipVerification
  // service (called by search-service to verify X-Org-Id before trusting it —
  // resilience_patterns.md IDOR fix).
  CORE_GRPC_PORT: z.coerce.number().default(50052),

  // AI-Query Saga (Phase 5b). Cost is a flat per-query price for now — token-based
  // pricing needs usage numbers back from the provider, which the summarizer port
  // does not surface yet.
  AI_QUERY_CREDIT_COST: z.coerce.number().int().positive().default(1),
  AI_QUERY_TOP_K: z.coerce.number().int().min(1).max(50).default(10),
  // Token bucket in front of the saga — credit spend is already a quota, this
  // exists only to bound BURST (see the AiQuotaBucket model comment).
  AI_QUOTA_CAP: z.coerce.number().positive().default(20),
  AI_QUOTA_REFILL_PER_MIN: z.coerce.number().positive().default(10),
  // How long a credit hold may stay OPEN before ExpiredReservationSweeperService
  // releases it — the recovery path for a saga killed between reserving and
  // compensating. Comfortably above the RAG gRPC deadline (30s).
  AI_RESERVATION_TTL_MS: z.coerce.number().int().positive().default(300_000),
  AI_RESERVATION_SWEEP_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
})

export function validate(config: Record<string, unknown>) {
  const result = envValidationSchema.safeParse(config)

  if (!result.success) {
    throw new Error(`Environment variables validation failed: ${result.error.message}`)
  }

  return result.data
}
