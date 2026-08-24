import type { CoreApiRepos } from '@/common/database/core-api-repos'
import type { ICreditEventRepository } from '@/modules/credit/domain/repositories/credit-event.repository'
import { CreditAccount } from '@/modules/credit/domain/entities/credit-account.aggregate'
import { InsufficientCreditsError } from '@/modules/credit/domain/credit.error'
import { ReserveCreditsHandler } from './reserve-credits.handler'
import { ReserveCreditsCommand } from './reserve-credits.command'

describe('ReserveCreditsHandler', () => {
  let handler: ReserveCreditsHandler
  let tx: CoreApiRepos
  let mockCreditRepo: jest.Mocked<ICreditEventRepository>

  beforeEach(() => {
    mockCreditRepo = { loadOrOpen: jest.fn(), save: jest.fn() }
    handler = new ReserveCreditsHandler()
    tx = { creditEvents: mockCreditRepo } as unknown as CoreApiRepos
  })

  it('nên giữ tiền mà không đổi balance, trả về available còn lại', async () => {
    const account = CreditAccount.open('org-1', 'user-1')
    account.grant(100, 'top-up')
    mockCreditRepo.loadOrOpen.mockResolvedValue(account)

    const result = await handler.execute(
      new ReserveCreditsCommand('org-1', 'user-1', 'res-1', 30, 'AI query'),
      tx,
    )

    expect(result).toEqual({ available: 70 })
    expect(account.balance).toBe(100)
    expect(mockCreditRepo.save).toHaveBeenCalledWith(account)
  })

  it('nên throw InsufficientCreditsError theo AVAILABLE (không phải balance) và không save', async () => {
    const account = CreditAccount.open('org-1', 'user-1')
    account.grant(100, 'top-up')
    account.reserve('res-other', 80, 'AI query đang chạy')
    mockCreditRepo.loadOrOpen.mockResolvedValue(account)

    // balance = 100 nhưng available = 20 -> reserve 30 phải fail.
    await expect(
      handler.execute(new ReserveCreditsCommand('org-1', 'user-1', 'res-1', 30, 'AI query'), tx),
    ).rejects.toThrow(InsufficientCreditsError)

    expect(mockCreditRepo.save).not.toHaveBeenCalled()
  })
})
