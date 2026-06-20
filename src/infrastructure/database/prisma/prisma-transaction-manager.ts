import { Injectable } from '@nestjs/common'
import type { ITransactionManager } from '@/common/database/transaction-manager.interface'
import { runInTransaction } from '@/common/database/transaction.context'
import { PrismaService } from './prisma.service'

@Injectable()
export class PrismaTransactionManager implements ITransactionManager {
  constructor(private readonly prisma: PrismaService) {}

  run<R>(callback: () => Promise<R>): Promise<R> {
    return this.prisma.$transaction(
      (tx) => runInTransaction(tx, callback),
      { timeout: 10000 }
    );
  }
}
