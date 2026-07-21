import { Global, Module } from '@nestjs/common'
import { IdempotencyInterceptor } from './idempotency.interceptor'
import { IdempotencyCleanupService } from './idempotency-cleanup.service'

/**
 * HTTP-layer idempotency only (X-Idempotency-Key response caching) — NOT the
 * Kafka-consumer idempotency mechanism (natural-key/dedup-constraint, see
 * idempotency_strategy.md), which is a separate discipline enforced in the
 * messaging layer, not a NestJS module. Any HTTP module may
 * `@UseInterceptors(IdempotencyInterceptor)` on a route without importing this
 * module (Global), since the interceptor itself is stateless besides
 * PrismaService (already Global). Registered once here instead of
 * copy-pasted as a provider into every consuming module (was previously only
 * inside CreditModule despite protecting routes in other modules — see
 * resilience_patterns.md §1).
 */
@Global()
@Module({
  providers: [IdempotencyInterceptor, IdempotencyCleanupService],
  exports: [IdempotencyInterceptor],
})
export class HttpIdempotencyModule {}
