import { Module } from '@nestjs/common'
import { TenantModule } from '@/modules/tenant/tenant.module'
import { CREDIT_EVENT_REPOSITORY } from './domain/repositories/credit-event.repository'
import { WALLET_QUERY_REPOSITORY } from './application/queries/wallet.query-repository'
import { GrantCreditsHandler } from './application/commands/grant-credits/grant-credits.handler'
import { SpendCreditsHandler } from './application/commands/spend-credits/spend-credits.handler'
import { RefundCreditsHandler } from './application/commands/refund-credits/refund-credits.handler'
import { GetWalletHandler } from './application/queries/get-wallet/get-wallet.handler'
import { PrismaCreditEventRepository } from './infrastructure/repositories/prisma-credit-event.repository'
import { PrismaWalletQueryRepository } from './infrastructure/repositories/prisma-wallet.query-repository'
import { CreditController } from './presentation/controllers/credit.controller'

@Module({
  imports: [TenantModule], // OrgGuard + RequireOrgPermission resolution
  controllers: [CreditController],
  exports: [CREDIT_EVENT_REPOSITORY],
  providers: [
    // Command handlers
    GrantCreditsHandler,
    SpendCreditsHandler,
    RefundCreditsHandler,
    // Query handlers
    GetWalletHandler,
    // Write repository (event-sourced ledger)
    { provide: CREDIT_EVENT_REPOSITORY, useClass: PrismaCreditEventRepository },
    // Read repository (folds the ledger)
    { provide: WALLET_QUERY_REPOSITORY, useClass: PrismaWalletQueryRepository },
  ],
})
export class CreditModule {}
