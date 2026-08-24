import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { GrantCreditsHandler } from './grant-credits.handler'
import { GrantCreditsCommand } from './grant-credits.command'
import type { ICreditEventRepository } from '@/modules/credit/domain/repositories/credit-event.repository'
import type { IMembershipRepository } from '@/modules/tenant/domain/repositories/membership.repository'
import type { IOutboxWriter } from '@distributed-social-platform/shared-kernel'
import { CreditAccount } from '@/modules/credit/domain/entities/credit-account.aggregate'
import { MembershipNotFoundError } from '@/modules/tenant/domain/tenant.error'
import { Membership } from '@/modules/tenant/domain/entities/membership.entity'
import { OrgRole } from '@/modules/tenant/domain/org-rbac'

describe('GrantCreditsHandler', () => {
  let handler: GrantCreditsHandler
  let tx: CoreApiRepos
  let mockCreditRepo: jest.Mocked<ICreditEventRepository>
  let mockMembershipRepo: jest.Mocked<IMembershipRepository>
  let mockOutbox: jest.Mocked<IOutboxWriter>

  beforeEach(() => {
    mockCreditRepo = {
      loadOrOpen: jest.fn(),
      save: jest.fn(),
    }
    mockMembershipRepo = {
      findByOrgAndUser: jest.fn(),
      save: jest.fn(),
    }
    mockOutbox = { append: jest.fn() }
    handler = new GrantCreditsHandler()
    tx = {
      creditEvents: mockCreditRepo,
      memberships: mockMembershipRepo,
      outbox: mockOutbox,
    } as unknown as CoreApiRepos
  })

  it('nên throw MembershipNotFoundError và KHÔNG chạm credit repo nếu recipient không phải member của org (ghost-wallet guard)', async () => {
    mockMembershipRepo.findByOrgAndUser.mockResolvedValue(null)

    await expect(
      handler.execute(new GrantCreditsCommand('org-1', 'not-a-member', 100, 'bonus'), tx),
    ).rejects.toThrow(MembershipNotFoundError)

    expect(mockMembershipRepo.findByOrgAndUser).toHaveBeenCalledWith('org-1', 'not-a-member')
    expect(mockCreditRepo.loadOrOpen).not.toHaveBeenCalled()
    expect(mockCreditRepo.save).not.toHaveBeenCalled()
    expect(mockOutbox.append).not.toHaveBeenCalled()
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

    const result = await handler.execute(
      new GrantCreditsCommand('org-1', 'user-1', 100, 'bonus'),
      tx,
    )

    expect(mockCreditRepo.loadOrOpen).toHaveBeenCalledWith('org-1', 'user-1')
    expect(mockCreditRepo.save).toHaveBeenCalledWith(account)
    expect(result).toEqual({ balance: 100 })
    // Dây credit-events: grant phải emit CreditAwarded trong cùng transaction.
    expect(mockOutbox.append).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'CreditAwarded',
        aggregateType: 'CreditAccount',
        orgId: 'org-1',
        payload: { userId: 'user-1', amount: 100, reason: 'bonus', balance: 100 },
      }),
    )
  })
})
