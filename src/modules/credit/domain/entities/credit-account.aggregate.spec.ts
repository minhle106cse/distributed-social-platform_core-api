import { CreditAccount } from './credit-account.aggregate'
import { InsufficientCreditsError, InvalidCreditAmountError } from '../credit.errors'

describe('CreditAccount', () => {
  describe('open', () => {
    it('nên tạo wallet rỗng — version 0, balance 0', () => {
      const account = CreditAccount.open('org-1', 'user-1')

      expect(account.version).toBe(0)
      expect(account.balance).toBe(0)
      expect(account.aggregateId).toBe(CreditAccount.walletId('org-1', 'user-1'))
      expect(account.getUncommittedEvents()).toEqual([])
    })
  })

  describe('grant', () => {
    it('nên cộng balance và tăng version, tạo đúng 1 uncommitted event CreditGranted', () => {
      const account = CreditAccount.open('org-1', 'user-1')

      account.grant(100, 'signup bonus')

      expect(account.balance).toBe(100)
      expect(account.version).toBe(1)
      expect(account.getUncommittedEvents()).toEqual([
        expect.objectContaining({
          eventType: 'CreditGranted',
          version: 1,
          payload: { amount: 100, reason: 'signup bonus' },
        }),
      ])
    })

    it('nên throw InvalidCreditAmountError nếu amount không phải số nguyên dương', () => {
      const account = CreditAccount.open('org-1', 'user-1')

      expect(() => account.grant(0, 'x')).toThrow(InvalidCreditAmountError)
      expect(() => account.grant(-5, 'x')).toThrow(InvalidCreditAmountError)
      expect(() => account.grant(1.5, 'x')).toThrow(InvalidCreditAmountError)
      // Không có event nào được raise khi validation fail
      expect(account.getUncommittedEvents()).toEqual([])
    })
  })

  describe('spend', () => {
    it('nên trừ balance khi đủ tiền', () => {
      const account = CreditAccount.open('org-1', 'user-1')
      account.grant(100, 'top-up')

      account.spend(30, 'AI query')

      expect(account.balance).toBe(70)
      expect(account.version).toBe(2)
    })

    it('nên throw InsufficientCreditsError khi spend vượt quá balance hiện có, KHÔNG raise event', () => {
      const account = CreditAccount.open('org-1', 'user-1')
      account.grant(50, 'top-up')

      expect(() => account.spend(51, 'AI query')).toThrow(InsufficientCreditsError)
      // balance/version không đổi — spend thất bại không được để lại tác dụng phụ
      expect(account.balance).toBe(50)
      expect(account.version).toBe(1)
    })

    it('nên cho spend đúng bằng balance hiện có (boundary, không throw)', () => {
      const account = CreditAccount.open('org-1', 'user-1')
      account.grant(50, 'top-up')

      account.spend(50, 'AI query')

      expect(account.balance).toBe(0)
    })

    it('nên throw InvalidCreditAmountError nếu amount không phải số nguyên dương', () => {
      const account = CreditAccount.open('org-1', 'user-1')
      account.grant(100, 'top-up')

      expect(() => account.spend(-1, 'x')).toThrow(InvalidCreditAmountError)
    })
  })

  describe('refund', () => {
    it('nên cộng lại balance (compensation cho AI-Query Saga)', () => {
      const account = CreditAccount.open('org-1', 'user-1')
      account.grant(100, 'top-up')
      account.spend(40, 'AI query')

      account.refund(40, 'AI query failed, compensate')

      expect(account.balance).toBe(100)
      expect(account.version).toBe(3)
    })

    it('nên throw InvalidCreditAmountError nếu amount không phải số nguyên dương', () => {
      const account = CreditAccount.open('org-1', 'user-1')

      expect(() => account.refund(0, 'x')).toThrow(InvalidCreditAmountError)
    })
  })

  describe('rehydrate', () => {
    it('nên fold đúng balance/version từ event stream đã lưu', () => {
      const events = [
        {
          aggregateId: CreditAccount.walletId('org-1', 'user-1'),
          orgId: 'org-1',
          userId: 'user-1',
          eventType: 'CreditGranted' as const,
          version: 1,
          payload: { amount: 100, reason: 'top-up' },
        },
        {
          aggregateId: CreditAccount.walletId('org-1', 'user-1'),
          orgId: 'org-1',
          userId: 'user-1',
          eventType: 'CreditSpent' as const,
          version: 2,
          payload: { amount: 30, reason: 'AI query' },
        },
        {
          aggregateId: CreditAccount.walletId('org-1', 'user-1'),
          orgId: 'org-1',
          userId: 'user-1',
          eventType: 'CreditRefunded' as const,
          version: 3,
          payload: { amount: 10, reason: 'compensate' },
        },
      ]

      const account = CreditAccount.rehydrate('org-1', 'user-1', events)

      // 0 + 100 - 30 + 10 = 80
      expect(account.balance).toBe(80)
      expect(account.version).toBe(3)
      // Rehydrate không tạo uncommitted events mới — đây là replay, không phải hành động mới
      expect(account.getUncommittedEvents()).toEqual([])
    })

    it('nên trả wallet rỗng khi rehydrate với event stream rỗng', () => {
      const account = CreditAccount.rehydrate('org-1', 'user-1', [])

      expect(account.balance).toBe(0)
      expect(account.version).toBe(0)
    })
  })
})
