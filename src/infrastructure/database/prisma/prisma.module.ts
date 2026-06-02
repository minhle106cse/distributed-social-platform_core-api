import { PrismaService } from './prisma.service'
import { Global, Module } from '@nestjs/common'

import { PrismaTransactionManager } from './prisma-transaction-manager'
import { TRANSACTION_MANAGER } from '@/common/database/transaction-manager.interface'

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: TRANSACTION_MANAGER,
      useClass: PrismaTransactionManager,
    },
  ],
  exports: [PrismaService, TRANSACTION_MANAGER],
})
export class PrismaModule {}
