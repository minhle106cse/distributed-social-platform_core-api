import type { PrismaClient } from '@prisma/client';
import { ITransactionManager } from '@/common/database/transaction-manager.interface';
import { runInTransaction } from '@/common/database/transaction.context';

export class PrismaTransactionManager implements ITransactionManager {
  constructor(private readonly prisma: PrismaClient) {}

  run<R>(callback: () => Promise<R>): Promise<R> {
    return this.prisma.$transaction(
      (tx) => runInTransaction(tx, callback),
      { timeout: 10000 }
    );
  }
}
