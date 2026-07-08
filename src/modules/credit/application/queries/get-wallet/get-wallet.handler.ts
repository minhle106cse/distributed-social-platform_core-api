import { Injectable, Inject } from '@nestjs/common'
import type { IQueryHandler } from '@distributed-social-platform/shared-kernel'
import { QueryHandler } from '@/infrastructure/cqrs/decorators/query-handler.decorator'
import { WALLET_QUERY_REPOSITORY } from '../wallet.query-repository'
import type { IWalletQueryRepository } from '../wallet.query-repository'
import type { WalletDto } from '../wallet.dto'
import { GetWalletQuery } from './get-wallet.query'

const RECENT_LEDGER_LIMIT = 50

@Injectable()
@QueryHandler(GetWalletQuery)
export class GetWalletHandler implements IQueryHandler<GetWalletQuery, WalletDto> {
  constructor(
    @Inject(WALLET_QUERY_REPOSITORY) private readonly walletRepo: IWalletQueryRepository,
  ) {}

  async execute(query: GetWalletQuery): Promise<WalletDto> {
    return this.walletRepo.getWallet(query.orgId, query.userId, RECENT_LEDGER_LIMIT)
  }
}
