import { Global, Module } from '@nestjs/common'
import { SAGA_COMPENSATION_STORE } from '@distributed-social-platform/shared-kernel'
import { PrismaSagaCompensationRepository } from './prisma-saga-compensation.repository'
import { SagaCompensationRegistry } from './saga-compensation.registry'
import { SagaCompensationReaperService } from './saga-compensation-reaper.service'
import { SagaCompensationCleanupService } from './saga-compensation-cleanup.service'

/**
 * Global, like PrismaModule (TX_RUNNER) — CqrsModule injects SAGA_COMPENSATION_STORE
 * to build CommandBus, and it has no other dependency on this module, so this
 * follows the same "global infra token" pattern rather than an explicit import
 * that would tie CqrsModule to a specific business module.
 */
@Global()
@Module({
  providers: [
    PrismaSagaCompensationRepository,
    // Only the shared-kernel port gets a token — the reaper/cleanup services inject
    // the class itself, since both ends of that call are infrastructure (§6.1).
    { provide: SAGA_COMPENSATION_STORE, useExisting: PrismaSagaCompensationRepository },
    SagaCompensationRegistry,
    SagaCompensationReaperService,
    SagaCompensationCleanupService,
  ],
  exports: [SAGA_COMPENSATION_STORE, SagaCompensationRegistry],
})
export class SagaCompensationModule {}
