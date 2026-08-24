import type { CoreApiRepos } from '@/common/database/core-api-repos'
import type { ICreditEventRepository } from '@/modules/credit/domain/repositories/credit-event.repository'
import type { IAiQueryRepository } from '@/modules/credit/domain/repositories/ai-query.repository'
import type { IOutboxWriter } from '@distributed-social-platform/shared-kernel'
import { CreditAccount } from '@/modules/credit/domain/entities/credit-account.aggregate'
import { ReleaseCreditReservationHandler } from './release-credit-reservation.handler'
import { ReleaseCreditReservationCommand } from './release-credit-reservation.command'

/**
 * Handler này chạy NHIỀU LẦN theo thiết kế — saga rollback, rồi
 * SagaCompensationReaperService retry, rồi ExpiredReservationSweeperService quét.
 * Nên phần lớn test ở đây là về lần chạy THỨ HAI, không phải lần đầu.
 */
describe('ReleaseCreditReservationHandler', () => {
  let handler: ReleaseCreditReservationHandler
  let tx: CoreApiRepos
  let mockCreditRepo: jest.Mocked<ICreditEventRepository>
  let mockAiQueryRepo: jest.Mocked<IAiQueryRepository>
  let mockOutbox: jest.Mocked<IOutboxWriter>

  beforeEach(() => {
    mockCreditRepo = { loadOrOpen: jest.fn(), save: jest.fn() }
    mockAiQueryRepo = { record: jest.fn().mockResolvedValue('q-1') }
    mockOutbox = { append: jest.fn() }
    handler = new ReleaseCreditReservationHandler()
    tx = {
      creditEvents: mockCreditRepo,
      aiQueries: mockAiQueryRepo,
      outbox: mockOutbox,
    } as unknown as CoreApiRepos
  })

  const command = (reason = 'AI_UNAVAILABLE') =>
    new ReleaseCreditReservationCommand('org-1', 'user-1', 'res-1', 'câu hỏi', reason)

  function accountWithOpenReservation(): CreditAccount {
    const account = CreditAccount.open('org-1', 'user-1')
    account.grant(100, 'top-up')
    account.reserve('res-1', 30, 'AI query')
    return account
  }

  it('nên release, ghi AiQuery FAILED với cost 0, và append CreditReservationReleased', async () => {
    const account = accountWithOpenReservation()
    mockCreditRepo.loadOrOpen.mockResolvedValue(account)

    const result = await handler.execute(command(), tx)

    expect(result).toEqual({ released: true, balance: 100, aiQueryId: 'q-1' })
    expect(mockCreditRepo.save).toHaveBeenCalledWith(account)
    expect(mockAiQueryRepo.record).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FAILED',
        answer: null,
        creditCost: 0,
        reservationId: 'res-1',
      }),
    )
    expect(mockOutbox.append).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'CreditReservationReleased',
        payload: expect.objectContaining({
          reservationId: 'res-1',
          amount: 30,
          reason: 'AI_UNAVAILABLE',
        }),
      }),
    )
  })

  it('reservation đã COMMITTED → no-op HOÀN TOÀN: không save, không ghi đè AiQuery, không emit', async () => {
    const account = accountWithOpenReservation()
    account.commitReservation('res-1', 'answered')
    mockCreditRepo.loadOrOpen.mockResolvedValue(account)

    const result = await handler.execute(command(), tx)

    // Đây là ca reaper retry một compensation đã lỗi thời. Nếu chỉ chặn ledger mà
    // vẫn ghi AiQuery thì row ANSWERED của lần chạy đó bị đè thành FAILED, và user
    // nhận notification "bạn không bị trừ" cho một câu trả lời họ ĐÃ trả tiền.
    expect(result).toEqual({ released: false, balance: 70, aiQueryId: null })
    expect(mockCreditRepo.save).not.toHaveBeenCalled()
    expect(mockAiQueryRepo.record).not.toHaveBeenCalled()
    expect(mockOutbox.append).not.toHaveBeenCalled()
  })

  it('release lần thứ hai → no-op, không emit event trùng', async () => {
    const account = accountWithOpenReservation()
    account.releaseReservation('res-1', 'AI_UNAVAILABLE')
    mockCreditRepo.loadOrOpen.mockResolvedValue(account)

    const result = await handler.execute(command(), tx)

    expect(result.released).toBe(false)
    expect(mockOutbox.append).not.toHaveBeenCalled()
  })

  it('nên cắt câu hỏi dài thành snippet cho notification', async () => {
    mockCreditRepo.loadOrOpen.mockResolvedValue(accountWithOpenReservation())
    const longQuestion = 'x'.repeat(500)

    await handler.execute(
      new ReleaseCreditReservationCommand('org-1', 'user-1', 'res-1', longQuestion, 'EXPIRED'),
      tx,
    )

    const appended = mockOutbox.append.mock.calls[0][0] as { payload: { questionSnippet: string } }
    expect(appended.payload.questionSnippet).toHaveLength(140)
  })
})
