import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { SpendCreditsHandler } from './spend-credits.handler'
import { SpendCreditsCommand } from './spend-credits.command'
import type { ICreditEventRepository } from '@/modules/credit/domain/repositories/credit-event.repository'
import { CreditAccount } from '@/modules/credit/domain/entities/credit-account.aggregate'
import {
  InsufficientCreditsError,
  CreditConcurrencyError,
} from '@/modules/credit/domain/credit.error'

describe('SpendCreditsHandler', () => {
  let handler: SpendCreditsHandler
  let tx: CoreApiRepos
  let mockCreditRepo: jest.Mocked<ICreditEventRepository>

  beforeEach(() => {
    mockCreditRepo = {
      loadOrOpen: jest.fn(),
      save: jest.fn(),
    }
    handler = new SpendCreditsHandler()
    tx = { creditEvents: mockCreditRepo } as unknown as CoreApiRepos
  })

  it('nên trừ balance và trả về {balance, spent} khi đủ tiền', async () => {
    const account = CreditAccount.open('org-1', 'user-1')
    account.grant(100, 'top-up')
    mockCreditRepo.loadOrOpen.mockResolvedValue(account)
    mockCreditRepo.save.mockResolvedValue()

    const result = await handler.execute(
      new SpendCreditsCommand('org-1', 'user-1', 30, 'AI query'),
      tx,
    )

    expect(mockCreditRepo.save).toHaveBeenCalledWith(account)
    expect(result).toEqual({ balance: 70, spent: 30 })
  })

  it('nên throw InsufficientCreditsError và KHÔNG gọi save() khi vượt quá balance', async () => {
    const account = CreditAccount.open('org-1', 'user-1')
    account.grant(10, 'top-up')
    mockCreditRepo.loadOrOpen.mockResolvedValue(account)

    await expect(
      handler.execute(new SpendCreditsCommand('org-1', 'user-1', 50, 'AI query'), tx),
    ).rejects.toThrow(InsufficientCreditsError)

    expect(mockCreditRepo.save).not.toHaveBeenCalled()
  })

  it('nên để CreditConcurrencyError (OCC conflict từ repo.save) đi thẳng ra ngoài, không nuốt lỗi', async () => {
    const account = CreditAccount.open('org-1', 'user-1')
    account.grant(100, 'top-up')
    mockCreditRepo.loadOrOpen.mockResolvedValue(account)
    mockCreditRepo.save.mockRejectedValue(new CreditConcurrencyError())

    await expect(
      handler.execute(new SpendCreditsCommand('org-1', 'user-1', 10, 'AI query'), tx),
    ).rejects.toThrow(CreditConcurrencyError)
  })
})
