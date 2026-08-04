import { Module } from '@nestjs/common'
import { TenantModule } from '@/modules/tenant/tenant.module'
import { WALLET_QUERY_REPOSITORY } from './application/queries/wallet.query-repository'
import { GrantCreditsHandler } from './application/commands/grant-credits/grant-credits.handler'
import { SpendCreditsHandler } from './application/commands/spend-credits/spend-credits.handler'
import { RefundCreditsHandler } from './application/commands/refund-credits/refund-credits.handler'
import { GetWalletHandler } from './application/queries/get-wallet/get-wallet.handler'
import { PrismaWalletQueryRepository } from './infrastructure/repositories/prisma-wallet.query-repository'
import { CreditController } from './presentation/controllers/credit.controller'

@Module({
  imports: [TenantModule], // OrgGuard + RequireOrgPermission resolution
  controllers: [CreditController],
  providers: [
    // Command handlers
    GrantCreditsHandler,
    SpendCreditsHandler,
    RefundCreditsHandler,
    // Query handlers
    GetWalletHandler,
    // Read repository (folds the ledger)
    { provide: WALLET_QUERY_REPOSITORY, useClass: PrismaWalletQueryRepository },
  ],
})
export class CreditModule {}
