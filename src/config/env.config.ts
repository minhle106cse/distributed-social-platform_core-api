import { registerAs } from '@nestjs/config'
import { validate } from './env.validation'

/**
 * Single source of truth for defaults is envValidationSchema — this factory
 * only reshapes the already-validated/coerced env into camelCase, it never
 * re-declares a default value (that used to drift silently from the schema).
 *
 * Exception: `PORT` is a raw, unvalidated escape hatch (not in the zod schema)
 * used to boot a second instance during smoke tests without touching
 * CORE_API_PORT — see PROJECT_STATUS.md gotcha on booting instance #2.
 */
export const envConfig = registerAs('env', () => {
  const env = validate(process.env)
  return {
    nodeEnv: env.NODE_ENV,
    port: Number(process.env.PORT ?? env.CORE_API_PORT),
    corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS,
    redisUrl: env.REDIS_URL,
    jwtPublicKey: Buffer.from(env.JWT_PUBLIC_KEY, 'base64').toString('utf-8'),
    kafkaBrokers: env.KAFKA_BROKERS.split(','),
    kafkaClientId: env.CORE_KAFKA_CLIENT_ID,
    outboxMaxAttempts: env.OUTBOX_MAX_ATTEMPTS,
    outboxPollBatchSize: env.OUTBOX_POLL_BATCH_SIZE,
    outboxClaimTimeoutMs: env.OUTBOX_CLAIM_TIMEOUT_MS,
    outboxPurgeRetentionDays: env.OUTBOX_PURGE_RETENTION_DAYS,
    sagaCompensationMaxAttempts: env.SAGA_COMPENSATION_MAX_ATTEMPTS,
    sagaCompensationPollBatchSize: env.SAGA_COMPENSATION_POLL_BATCH_SIZE,
    sagaCompensationClaimTimeoutMs: env.SAGA_COMPENSATION_CLAIM_TIMEOUT_MS,
    sagaCompensationPurgeRetentionDays: env.SAGA_COMPENSATION_PURGE_RETENTION_DAYS,
    authGrpcUrl: env.AUTH_GRPC_URL,
    searchGrpcUrl: env.SEARCH_GRPC_URL,
    internalGrpcSharedSecret: env.INTERNAL_GRPC_SHARED_SECRET,
    coreGrpcPort: env.CORE_GRPC_PORT,
    aiQueryCreditCost: env.AI_QUERY_CREDIT_COST,
    aiQueryTopK: env.AI_QUERY_TOP_K,
    aiQuotaCap: env.AI_QUOTA_CAP,
    aiQuotaRefillPerMin: env.AI_QUOTA_REFILL_PER_MIN,
    aiReservationTtlMs: env.AI_RESERVATION_TTL_MS,
    aiReservationSweepIntervalMs: env.AI_RESERVATION_SWEEP_INTERVAL_MS,
  }
})
