import type { WalletDto } from '../queries/wallet.dto'

export interface IWalletQueryRepository {
  // Folds the credit_events stream into a balance + recent ledger view.
  // Returns a zeroed wallet if the stream is empty (a wallet is implicit).
  getWallet(orgId: string, userId: string, recentLimit: number): Promise<WalletDto>
}

export const WALLET_QUERY_REPOSITORY = Symbol('IWalletQueryRepository')
