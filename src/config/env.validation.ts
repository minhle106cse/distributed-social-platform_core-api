import { z } from 'zod'

export const envValidationSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORE_API_PORT: z.coerce.number().default(4002),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3001'),
  CORE_DATABASE_URL: z.string().url(),
  JWT_PUBLIC_KEY: z.string().min(100),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  CORE_KAFKA_CLIENT_ID: z.string().default('core-api'),
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  OUTBOX_POLL_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(50),
  OUTBOX_CLAIM_TIMEOUT_MS: z.coerce.number().int().min(1000).default(60000),

  // gRPC client target for auth-service's internal AuthProvisioning service
  // (platform-admin org provisioning). Shared secret must match auth-service's.
  AUTH_GRPC_URL: z.string().default('localhost:50051'),
  INTERNAL_GRPC_SHARED_SECRET: z.string().min(16),
})

export function validate(config: Record<string, unknown>) {
  const result = envValidationSchema.safeParse(config)

  if (!result.success) {
    throw new Error(`Environment variables validation failed: ${result.error.message}`)
  }

  return result.data
}
