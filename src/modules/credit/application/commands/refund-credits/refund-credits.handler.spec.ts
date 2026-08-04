import type { CoreApiRepos } from '@/infrastructure/database/prisma/core-api-repos.factory'
import { RefundCreditsHandler } from './refund-credits.handler'
import { RefundCreditsCommand } from './refund-credits.command'
import type { ICreditEventRepository } from '@/modules/credit/domain/repositories/credit-event.repository'
import { CreditAccount } from '@/modules/credit/domain/entities/credit-account.aggregate'

describe('RefundCreditsHandler', () => {
  let handler: RefundCreditsHandler
  let tx: CoreApiRepos
  let mockCreditRepo: jest.Mocked<ICreditEventRepository>

  beforeEach(() => {
    mockCreditRepo = {
      loadOrOpen: jest.fn(),
      save: jest.fn(),
    }
    handler = new RefundCreditsHandler()
    tx = { creditEvents: mockCreditRepo } as unknown as CoreApiRepos
  })

  it('nên cộng lại balance đã spend (AI-Query Saga compensation) và trả về balance mới', async () => {
    const account = CreditAccount.open('org-1', 'user-1')
    account.grant(100, 'top-up')
    account.spend(40, 'AI query')
    mockCreditRepo.loadOrOpen.mockResolvedValue(account)
    mockCreditRepo.save.mockResolvedValue()

    const result = await handler.execute(
      new RefundCreditsCommand('org-1', 'user-1', 40, 'AI query failed, compensate'),
      tx,
    )

    expect(mockCreditRepo.save).toHaveBeenCalledWith(account)
    expect(result).toEqual({ balance: 100 })
  })
})
