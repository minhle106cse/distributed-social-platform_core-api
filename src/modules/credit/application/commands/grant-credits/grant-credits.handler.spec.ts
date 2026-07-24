import { GrantCreditsHandler } from './grant-credits.handler'
import { GrantCreditsCommand } from './grant-credits.command'
import type { ICreditEventRepository } from '@/modules/credit/domain/repositories/credit-event.repository'
import type { IMembershipRepository } from '@/modules/tenant/domain/repositories/membership.repository'
import { CreditAccount } from '@/modules/credit/domain/entities/credit-account.aggregate'
import { MembershipNotFoundError } from '@/common/errors/tenant.error'
import { Membership } from '@/modules/tenant/domain/entities/membership.entity'
import { OrgRole } from '@/modules/tenant/domain/org-rbac'

describe('GrantCreditsHandler', () => {
  let handler: GrantCreditsHandler
  let mockCreditRepo: jest.Mocked<ICreditEventRepository>
  let mockMembershipRepo: jest.Mocked<IMembershipRepository>

  beforeEach(() => {
    mockCreditRepo = {
      loadOrOpen: jest.fn(),
      save: jest.fn(),
    }
    mockMembershipRepo = {
      findByOrgAndUser: jest.fn(),
      save: jest.fn(),
    }
    handler = new GrantCreditsHandler(mockCreditRepo, mockMembershipRepo)
  })

  it('nên throw MembershipNotFoundError và KHÔNG chạm credit repo nếu recipient không phải member của org (ghost-wallet guard)', async () => {
    mockMembershipRepo.findByOrgAndUser.mockResolvedValue(null)

    await expect(
      handler.execute(new GrantCreditsCommand('org-1', 'not-a-member', 100, 'bonus')),
    ).rejects.toThrow(MembershipNotFoundError)

    expect(mockMembershipRepo.findByOrgAndUser).toHaveBeenCalledWith('org-1', 'not-a-member')
    expect(mockCreditRepo.loadOrOpen).not.toHaveBeenCalled()
    expect(mockCreditRepo.save).not.toHaveBeenCalled()
  })

  it('nên grant credit và trả về balance mới khi recipient là member hợp lệ', async () => {
    mockMembershipRepo.findByOrgAndUser.mockResolvedValue(
      Membership.rehydrate({
        id: 'm1',
        orgId: 'org-1',
        userId: 'user-1',
        role: OrgRole.MEMBER,
        joinedAt: new Date(),
      }),
    )
    const account = CreditAccount.open('org-1', 'user-1')
    mockCreditRepo.loadOrOpen.mockResolvedValue(account)
    mockCreditRepo.save.mockResolvedValue()

    const result = await handler.execute(new GrantCreditsCommand('org-1', 'user-1', 100, 'bonus'))

    expect(mockCreditRepo.loadOrOpen).toHaveBeenCalledWith('org-1', 'user-1')
    expect(mockCreditRepo.save).toHaveBeenCalledWith(account)
    expect(result).toEqual({ balance: 100 })
  })
})
