import { CreditAccount } from './credit-account.aggregate'
import type { CreditLedgerEvent } from './credit-account.aggregate'
import {
  InsufficientCreditsError,
  InvalidCreditAmountError,
  ReservationNotOpenError,
} from '../credit.error'
import { PrismaWalletQueryRepository } from '../../infrastructure/repositories/prisma-wallet.query-repository'
import type { PrismaService } from '@/infrastructure/database/prisma/prisma.service'

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

  // ── Two-phase reserve (Phase 5b) ────────────────────────────────────────────
  describe('reserve', () => {
    it('nên giữ tiền mà KHÔNG đổi balance — chỉ available giảm', () => {
      const account = CreditAccount.open('org-1', 'user-1')
      account.grant(100, 'top-up')

      account.reserve('res-1', 30, 'AI query')

      expect(account.balance).toBe(100)
      expect(account.reserved).toBe(30)
      expect(account.available).toBe(70)
      expect(account.reservationStatus('res-1')).toBe('OPEN')
      expect(account.getUncommittedEvents()).toContainEqual(
        expect.objectContaining({
          eventType: 'CreditReserved',
          version: 2,
          payload: { amount: 30, reason: 'AI query', reservationId: 'res-1' },
        }),
      )
    })

    it('nên so với AVAILABLE chứ không phải balance — 2 reservation song song phải thấy nhau', () => {
      const account = CreditAccount.open('org-1', 'user-1')
      account.grant(100, 'top-up')
      account.reserve('res-1', 60, 'AI query 1')

      // balance vẫn 100 nhưng chỉ còn 40 available -> reserve 50 phải fail. Đây
      // chính là lỗi OCC KHÔNG bắt được (hai lệnh nằm ở hai version khác nhau).
      expect(() => account.reserve('res-2', 50, 'AI query 2')).toThrow(InsufficientCreditsError)
      expect(account.reserved).toBe(60)
      expect(account.version).toBe(2)
    })

    it('nên cho reserve đúng bằng available (boundary)', () => {
      const account = CreditAccount.open('org-1', 'user-1')
      account.grant(100, 'top-up')
      account.reserve('res-1', 60, 'AI query 1')

      account.reserve('res-2', 40, 'AI query 2')

      expect(account.available).toBe(0)
      expect(account.reserved).toBe(100)
    })
  })

  describe('spend vs reservation', () => {
    it('KHÔNG được cho spend phần tiền đang bị reservation giữ', () => {
      const account = CreditAccount.open('org-1', 'user-1')
      account.grant(100, 'top-up')
      account.reserve('res-1', 100, 'AI query')

      // Nếu spend() so với _balance (như trước Phase 5b) thì lệnh này lọt và
      // available tụt xuống -100.
      expect(() => account.spend(100, 'direct spend')).toThrow(InsufficientCreditsError)
      expect(account.balance).toBe(100)
    })
  })

  describe('commitReservation', () => {
    it('nên trừ balance đúng số đã giữ và đóng reservation', () => {
      const account = CreditAccount.open('org-1', 'user-1')
      account.grant(100, 'top-up')
      account.reserve('res-1', 30, 'AI query')

      account.commitReservation('res-1', 'AI query answered')

      expect(account.balance).toBe(70)
      expect(account.available).toBe(70)
      expect(account.reserved).toBe(0)
      expect(account.reservationStatus('res-1')).toBe('COMMITTED')
    })

    it('nên throw ReservationNotOpenError khi reservation không tồn tại hoặc đã đóng', () => {
      const account = CreditAccount.open('org-1', 'user-1')
      account.grant(100, 'top-up')
      account.reserve('res-1', 30, 'AI query')
      account.commitReservation('res-1', 'AI query answered')

      expect(() => account.commitReservation('res-1', 'again')).toThrow(ReservationNotOpenError)
      expect(() => account.commitReservation('res-unknown', 'x')).toThrow(ReservationNotOpenError)
      expect(account.balance).toBe(70)
    })
  })

  describe('releaseReservation — idempotent (compensation, sẽ bị reaper retry)', () => {
    it('nên trả tiền về available mà KHÔNG đụng balance', () => {
      const account = CreditAccount.open('org-1', 'user-1')
      account.grant(100, 'top-up')
      account.reserve('res-1', 30, 'AI query')

      expect(account.releaseReservation('res-1', 'AI_UNAVAILABLE')).toBe(true)

      expect(account.balance).toBe(100)
      expect(account.available).toBe(100)
      expect(account.reserved).toBe(0)
      expect(account.reservationStatus('res-1')).toBe('RELEASED')
    })

    it('release lần 2 phải là no-op — trả false, KHÔNG raise event', () => {
      const account = CreditAccount.open('org-1', 'user-1')
      account.grant(100, 'top-up')
      account.reserve('res-1', 30, 'AI query')
      account.releaseReservation('res-1', 'AI_UNAVAILABLE')
      const versionAfterFirstRelease = account.version

      expect(account.releaseReservation('res-1', 'AI_UNAVAILABLE')).toBe(false)

      expect(account.version).toBe(versionAfterFirstRelease)
      expect(account.balance).toBe(100)
    })

    it('release trên reservation ĐÃ COMMITTED phải là no-op — đây là ca làm lệch ledger', () => {
      const account = CreditAccount.open('org-1', 'user-1')
      account.grant(100, 'top-up')
      account.reserve('res-1', 30, 'AI query')
      account.commitReservation('res-1', 'answered')

      // Reaper retry một compensation đã lỗi thời: nếu raise event ở đây thì user
      // được "hoàn" 30 credit chưa từng bị giữ -> Sum(events) != Balance.
      expect(account.releaseReservation('res-1', 'AI_UNAVAILABLE')).toBe(false)
      expect(account.balance).toBe(70)
      expect(
        account.getUncommittedEvents().filter((e) => e.eventType === 'CreditReservationReleased'),
      ).toEqual([])
    })

    it('release trên reservation chưa từng tồn tại phải là no-op', () => {
      const account = CreditAccount.open('org-1', 'user-1')
      account.grant(100, 'top-up')

      expect(account.releaseReservation('res-ghost', 'AI_UNAVAILABLE')).toBe(false)
      expect(account.version).toBe(1)
    })
  })

  describe('rehydrate — stream hỗn hợp cả 6 loại event', () => {
    it('nên fold ra đúng balance/available/reserved', () => {
      const account = CreditAccount.rehydrate('org-1', 'user-1', mixedStream())

      // grant 100 + refund 10 - spend 20 - commit 15 = 75
      expect(account.balance).toBe(75)
      // res-3 vẫn OPEN, giữ 25
      expect(account.reserved).toBe(25)
      expect(account.available).toBe(50)
      expect(account.reservationStatus('res-1')).toBe('COMMITTED')
      expect(account.reservationStatus('res-2')).toBe('RELEASED')
      expect(account.reservationStatus('res-3')).toBe('OPEN')
      expect(account.getUncommittedEvents()).toEqual([])
    })
  })

  /**
   * Hai bản fold — aggregate (write side, cái quyết định cho spend hay không) và
   * PrismaWalletQueryRepository (read side, cái user nhìn thấy) — là bản sao thủ
   * công của nhau, hệ quả của thiết kế SoT-only (không có bảng summary). Test này
   * không trả món nợ đó, nó chỉ đảm bảo lần lệch tiếp theo bị bắt ngay.
   */
  describe('fold parity: aggregate ↔ wallet query repository', () => {
    it('nên cho cùng balance/available/reserved trên cùng một chuỗi event', async () => {
      const events = mixedStream()
      const aggregate = CreditAccount.rehydrate('org-1', 'user-1', events)

      const prisma = {
        client: {
          creditEvent: {
            findMany: jest
              .fn()
              .mockResolvedValue(
                events.map((event) => ({ ...event, createdAt: new Date('2026-08-22T00:00:00Z') })),
              ),
          },
        },
      } as unknown as PrismaService
      const wallet = await new PrismaWalletQueryRepository(prisma).getWallet('org-1', 'user-1', 50)

      expect(wallet.balance).toBe(aggregate.balance)
      expect(wallet.available).toBe(aggregate.available)
      expect(wallet.reserved).toBe(aggregate.reserved)
      // Ledger integrity (acceptance criterion của Phase 5): tổng delta = balance.
      expect(wallet.entries.reduce((sum, entry) => sum + entry.delta, 0)).toBe(aggregate.balance)
    })
  })
})

// grant 100, spend 20, reserve+commit 15 (res-1), reserve+release 40 (res-2),
// reserve 25 còn OPEN (res-3), refund 10 — cả 6 eventType trong một chuỗi.
function mixedStream(): CreditLedgerEvent[] {
  const base = {
    aggregateId: CreditAccount.walletId('org-1', 'user-1'),
    orgId: 'org-1',
    userId: 'user-1',
  }
  const steps: Array<[CreditLedgerEvent['eventType'], CreditLedgerEvent['payload']]> = [
    ['CreditGranted', { amount: 100, reason: 'top-up' }],
    ['CreditSpent', { amount: 20, reason: 'direct spend' }],
    ['CreditReserved', { amount: 15, reason: 'AI query', reservationId: 'res-1' }],
    ['CreditReservationCommitted', { amount: 15, reason: 'answered', reservationId: 'res-1' }],
    ['CreditReserved', { amount: 40, reason: 'AI query', reservationId: 'res-2' }],
    ['CreditReservationReleased', { amount: 40, reason: 'AI_UNAVAILABLE', reservationId: 'res-2' }],
    ['CreditReserved', { amount: 25, reason: 'AI query', reservationId: 'res-3' }],
    ['CreditRefunded', { amount: 10, reason: 'goodwill' }],
  ]
  return steps.map(([eventType, payload], index) => ({
    ...base,
    eventType,
    version: index + 1,
    payload,
  }))
}
