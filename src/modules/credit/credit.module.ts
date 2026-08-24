import { Module, OnModuleInit } from '@nestjs/common'
import { CommandBus } from '@distributed-social-platform/shared-kernel'
import { TenantModule } from '@/modules/tenant/tenant.module'
import { SagaCompensationRegistry } from '@/infrastructure/saga-compensation/saga-compensation.registry'
import { AiQuotaGuard } from '@/infrastructure/http/guards/ai-quota.guard'
import { WALLET_QUERY_REPOSITORY } from './application/repositories/wallet.query-repository'
import { AI_QUERY_QUERY_REPOSITORY } from './application/repositories/ai-query.query-repository'
import { GrantCreditsHandler } from './application/commands/grant-credits/grant-credits.handler'
import { SpendCreditsHandler } from './application/commands/spend-credits/spend-credits.handler'
import { RefundCreditsHandler } from './application/commands/refund-credits/refund-credits.handler'
import { ReserveCreditsHandler } from './application/commands/reserve-credits/reserve-credits.handler'
import { CommitAiQueryHandler } from './application/commands/commit-ai-query/commit-ai-query.handler'
import { ReleaseCreditReservationHandler } from './application/commands/release-credit-reservation/release-credit-reservation.handler'
import { ReleaseCreditReservationCommand } from './application/commands/release-credit-reservation/release-credit-reservation.command'
import { AskAiHandler } from './application/commands/ask-ai/ask-ai.handler'
import { GetWalletHandler } from './application/queries/get-wallet/get-wallet.handler'
import { ListAiQueriesHandler } from './application/queries/list-ai-queries/list-ai-queries.handler'
import { PrismaWalletQueryRepository } from './infrastructure/repositories/prisma-wallet.query-repository'
import { PrismaAiQueryQueryRepository } from './infrastructure/repositories/prisma-ai-query.query-repository'
import { ExpiredReservationSweeperService } from './infrastructure/services/expired-reservation-sweeper.service'
import { CreditController } from './presentation/controllers/credit.controller'
import { AiQueryController } from './presentation/controllers/ai-query.controller'

@Module({
  imports: [
    TenantModule, // OrgGuard + RequireOrgPermission resolution
    // RAG_QUERY_SERVICE (the AI-Query Saga's call into search-service) comes from
    // GrpcModule, which is @Global and imported once by AppModule — no import here.
  ],
  controllers: [CreditController, AiQueryController],
  providers: [
    AiQuotaGuard,
    // Command handlers
    GrantCreditsHandler,
    SpendCreditsHandler,
    RefundCreditsHandler,
    ReserveCreditsHandler,
    CommitAiQueryHandler,
    ReleaseCreditReservationHandler,
    AskAiHandler,
    // Query handlers
    GetWalletHandler,
    ListAiQueriesHandler,
    // Read repositories (fold the ledger / read the query log)
    { provide: WALLET_QUERY_REPOSITORY, useClass: PrismaWalletQueryRepository },
    { provide: AI_QUERY_QUERY_REPOSITORY, useClass: PrismaAiQueryQueryRepository },
    // Recovery for holds abandoned by a crashed saga
    ExpiredReservationSweeperService,
  ],
})
export class CreditModule implements OnModuleInit {
  constructor(
    private readonly registry: SagaCompensationRegistry,
    private readonly commandBus: CommandBus,
  ) {}

  /**
   * Registers how SagaCompensationReaperService re-runs the compensation
   * `AskAiHandler` declares — the counterpart to its
   * `ctx.onCompensate({ type: 'release-credit-reservation', payload })`.
   *
   * Missing this is invisible at build time and only shows up the first time an
   * in-process compensation FAILS: the reaper treats an unknown actionType as a
   * permanent failure and sends the row straight to FAILED_DLQ, leaving the hold
   * open. Same registration pattern (and same reason) as PlatformAdminModule.
   */
  onModuleInit(): void {
    this.registry.register('release-credit-reservation', async (payload) => {
      await this.commandBus.execute(
        new ReleaseCreditReservationCommand(
          payload.orgId as string,
          payload.userId as string,
          payload.reservationId as string,
          payload.question as string,
          payload.reason as string,
        ),
      )
    })
  }
}
