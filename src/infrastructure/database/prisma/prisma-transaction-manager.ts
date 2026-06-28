import { Injectable } from '@nestjs/common'
import {
  runInTransaction,
  type ITransactionManager,
} from '@distributed-social-platform/shared-kernel'
import { PrismaService } from './prisma.service'

@Injectable()
export class PrismaTransactionManager implements ITransactionManager {
  constructor(private readonly prisma: PrismaService) {}

  run<R>(callback: () => Promise<R>): Promise<R> {
    return this.prisma.client.$transaction((tx) => runInTransaction(tx, callback), {
      timeout: 10000,
    })
  }
}
