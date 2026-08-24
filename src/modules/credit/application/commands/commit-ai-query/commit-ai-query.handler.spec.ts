import type { CoreApiRepos } from '@/common/database/core-api-repos'
import type { ICreditEventRepository } from '@/modules/credit/domain/repositories/credit-event.repository'
import type { IAiQueryRepository } from '@/modules/credit/domain/repositories/ai-query.repository'
import type { IOutboxWriter } from '@distributed-social-platform/shared-kernel'
import { CreditAccount } from '@/modules/credit/domain/entities/credit-account.aggregate'
import { ReservationNotOpenError } from '@/modules/credit/domain/credit.error'
import { CommitAiQueryHandler } from './commit-ai-query.handler'
import { CommitAiQueryCommand } from './commit-ai-query.command'

describe('CommitAiQueryHandler', () => {
  let handler: CommitAiQueryHandler
  let tx: CoreApiRepos
  let mockCreditRepo: jest.Mocked<ICreditEventRepository>
  let mockAiQueryRepo: jest.Mocked<IAiQueryRepository>
  let mockOutbox: jest.Mocked<IOutboxWriter>

  beforeEach(() => {
    mockCreditRepo = { loadOrOpen: jest.fn(), save: jest.fn() }
    mockAiQueryRepo = { record: jest.fn().mockResolvedValue('q-1') }
    mockOutbox = { append: jest.fn() }
    handler = new CommitAiQueryHandler()
    tx = {
      creditEvents: mockCreditRepo,
      aiQueries: mockAiQueryRepo,
      outbox: mockOutbox,
    } as unknown as CoreApiRepos
  })

  const command = () =>
    new CommitAiQueryCommand(
      'org-1',
      'user-1',
      'res-1',
      'câu hỏi',
      'câu trả lời',
      [{ knowledgeItemId: 'k-1', title: 'Deploy Guide' }],
      30,
      'AI query',
    )

  it('nên trừ balance đúng số đã giữ, lưu AiQuery ANSWERED và emit CreditSpent — cả 3 trong 1 lần chạy', async () => {
    const account = CreditAccount.open('org-1', 'user-1')
    account.grant(100, 'top-up')
    account.reserve('res-1', 30, 'AI query')
    mockCreditRepo.loadOrOpen.mockResolvedValue(account)

    const result = await handler.execute(command(), tx)

    expect(result).toEqual({ aiQueryId: 'q-1', balance: 70 })
    expect(account.available).toBe(70)
    expect(mockAiQueryRepo.record).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ANSWERED', answer: 'câu trả lời', creditCost: 30 }),
    )
    // Dây credit-events sống: CreditSpent mang cả reservationId lẫn aiQueryId để
    // consumer nối được ledger entry với lượt chạy saga sinh ra nó.
    expect(mockOutbox.append).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'CreditSpent',
        payload: expect.objectContaining({
          amount: 30,
          balance: 70,
          reservationId: 'res-1',
          aiQueryId: 'q-1',
        }),
      }),
    )
  })

  it('reservation đã bị sweeper release → throw, KHÔNG trừ tiền lần hai', async () => {
    const account = CreditAccount.open('org-1', 'user-1')
    account.grant(100, 'top-up')
    account.reserve('res-1', 30, 'AI query')
    account.releaseReservation('res-1', 'EXPIRED')
    mockCreditRepo.loadOrOpen.mockResolvedValue(account)

    await expect(handler.execute(command(), tx)).rejects.toThrow(ReservationNotOpenError)

    expect(mockCreditRepo.save).not.toHaveBeenCalled()
    expect(mockAiQueryRepo.record).not.toHaveBeenCalled()
    expect(mockOutbox.append).not.toHaveBeenCalled()
  })
})
