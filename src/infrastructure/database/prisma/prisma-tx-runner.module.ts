import { Global, Module } from '@nestjs/common'
import { TX_RUNNER } from '@distributed-social-platform/shared-kernel'
import { PrismaTxRunner } from './prisma-tx-runner'
import { CoreApiRepoFactory } from './core-api-repos.factory'

/**
 * Global for the same reason PrismaModule/CqrsModule are: every module's
 * command handlers need TX_RUNNER wherever they boot, and Nest only shares a
 * provider across sibling top-level modules automatically when it's global.
 *
 * Split out of PrismaModule (generic ORM client, no domain knowledge)
 * because PrismaTxRunner needs CoreApiRepoFactory (spans every module's
 * repos) injected at construction — one repos factory for the whole
 * service, no more `registerScope()` call per module's `onModuleInit`
 * (2026-07-30 collapse; see shared-kernel's tx-scope.ts doc for why the
 * per-module registry was removed). Nest's own DI graph now guarantees
 * construction order instead of 4 hand-written lifecycle hooks racing to
 * register before CqrsModule boots.
 */
@Global()
@Module({
  providers: [
    CoreApiRepoFactory,
    PrismaTxRunner,
    { provide: TX_RUNNER, useExisting: PrismaTxRunner },
  ],
  exports: [PrismaTxRunner, TX_RUNNER],
})
export class PrismaTxRunnerModule {}
