import { registerAs } from '@nestjs/config'

export const envConfig = registerAs('env', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.CORE_API_PORT ?? process.env.PORT ?? 4002),
  corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS,
  jwtPublicKey: Buffer.from(process.env.JWT_PUBLIC_KEY!, 'base64').toString('utf-8'),
  kafkaBrokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
  kafkaClientId: process.env.CORE_KAFKA_CLIENT_ID ?? 'core-api',
  outboxMaxAttempts: Number(process.env.OUTBOX_MAX_ATTEMPTS ?? 5),
  outboxPollBatchSize: Number(process.env.OUTBOX_POLL_BATCH_SIZE ?? 50),
  outboxClaimTimeoutMs: Number(process.env.OUTBOX_CLAIM_TIMEOUT_MS ?? 60000),
}))
