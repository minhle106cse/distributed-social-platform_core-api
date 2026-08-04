import { Global, Module } from '@nestjs/common'
import { ScheduledJobRegistry } from './scheduled-job-registry.service'

/**
 * Global, like KafkaModule/MessagingModule/SagaCompensationModule — every job
 * lives in a different feature module (OutboxModule, SagaCompensationModule,
 * HttpIdempotencyModule) that has no reason to import each other, so this
 * follows the same "global infra token" pattern rather than tying those
 * modules together just to share a registry.
 *
 * No controller — "what jobs exist" is a Prometheus info metric
 * (core_api_scheduled_job_info, set at register() time), not a REST endpoint.
 */
@Global()
@Module({
  providers: [ScheduledJobRegistry],
  exports: [ScheduledJobRegistry],
})
export class ScheduledJobsModule {}
