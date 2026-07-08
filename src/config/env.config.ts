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
    jwtPublicKey: Buffer.from(env.JWT_PUBLIC_KEY, 'base64').toString('utf-8'),
    kafkaBrokers: env.KAFKA_BROKERS.split(','),
    kafkaClientId: env.CORE_KAFKA_CLIENT_ID,
    outboxMaxAttempts: env.OUTBOX_MAX_ATTEMPTS,
    outboxPollBatchSize: env.OUTBOX_POLL_BATCH_SIZE,
    outboxClaimTimeoutMs: env.OUTBOX_CLAIM_TIMEOUT_MS,
    authGrpcUrl: env.AUTH_GRPC_URL,
    internalGrpcSharedSecret: env.INTERNAL_GRPC_SHARED_SECRET,
  }
})
