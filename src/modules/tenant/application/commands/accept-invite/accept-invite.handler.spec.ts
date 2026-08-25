import type { CoreApiRepos } from '@/common/database/core-api-repos'
import type { IOrgInviteRepository } from '@/modules/tenant/domain/repositories/org-invite.repository'
import type { IMembershipRepository } from '@/modules/tenant/domain/repositories/membership.repository'
import { OrgInvite } from '@/modules/tenant/domain/entities/org-invite.entity'
import { OrgRole } from '@/modules/tenant/domain/org-rbac'
import {
  InviteNotFoundError,
  InviteExpiredError,
  InviteAlreadyUsedError,
  AlreadyMemberError,
} from '@/modules/tenant/domain/tenant.error'
import { AcceptInviteHandler } from './accept-invite.handler'
import { AcceptInviteCommand } from './accept-invite.command'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

function buildInvite(overrides: Partial<Parameters<typeof OrgInvite.rehydrate>[0]> = {}) {
  return OrgInvite.rehydrate({
    id: 'invite-1',
    token: 'tok-1',
    orgId: 'org-1',
    role: OrgRole.MEMBER,
    createdBy: 'owner-1',
    expiresAt: new Date(Date.now() + 60_000),
    usedAt: null,
    usedBy: null,
    ...overrides,
  })
}

describe('AcceptInviteHandler', () => {
  const mockCache = { get: jest.fn(), set: jest.fn(), del: jest.fn() }

  let handler: AcceptInviteHandler
  let tx: CoreApiRepos
  let mockInviteRepo: jest.Mocked<IOrgInviteRepository>
  let mockMembershipRepo: jest.Mocked<IMembershipRepository>

  beforeEach(() => {
    mockCache.del.mockClear()
    mockInviteRepo = {
      save: jest.fn(),
      findByToken: jest.fn(),
    }

    mockMembershipRepo = {
      findByOrgAndUser: jest.fn(),
      save: jest.fn(),
    }

    handler = new AcceptInviteHandler(mockCache)
    tx = { invites: mockInviteRepo, memberships: mockMembershipRepo } as unknown as CoreApiRepos
  })

  it('should throw InviteNotFoundError when the token does not resolve to an invite', async () => {
    mockInviteRepo.findByToken.mockResolvedValueOnce(null)

    await expect(
      handler.execute(new AcceptInviteCommand('bad-token', 'user-2'), tx),
    ).rejects.toThrow(InviteNotFoundError)
  })

  it('should throw InviteExpiredError for an expired invite', async () => {
    mockInviteRepo.findByToken.mockResolvedValueOnce(
      buildInvite({ expiresAt: new Date(Date.now() - 1_000) }),
    )

    await expect(handler.execute(new AcceptInviteCommand('tok-1', 'user-2'), tx)).rejects.toThrow(
      InviteExpiredError,
    )
  })

  it('should throw InviteAlreadyUsedError for an already-consumed invite', async () => {
    mockInviteRepo.findByToken.mockResolvedValueOnce(
      buildInvite({ usedAt: new Date(), usedBy: 'someone-else' }),
    )

    await expect(handler.execute(new AcceptInviteCommand('tok-1', 'user-2'), tx)).rejects.toThrow(
      InviteAlreadyUsedError,
    )
  })

  it('should throw AlreadyMemberError when the accepting user is already a member of the org', async () => {
    mockInviteRepo.findByToken.mockResolvedValueOnce(buildInvite())
    mockMembershipRepo.findByOrgAndUser.mockResolvedValueOnce({} as never)

    await expect(handler.execute(new AcceptInviteCommand('tok-1', 'user-2'), tx)).rejects.toThrow(
      AlreadyMemberError,
    )
    expect(mockMembershipRepo.save).not.toHaveBeenCalled()
  })

  it('should create the membership with the invite role and mark the invite as used', async () => {
    const invite = buildInvite()
    mockInviteRepo.findByToken.mockResolvedValueOnce(invite)
    mockMembershipRepo.findByOrgAndUser.mockResolvedValueOnce(null)

    const result = await handler.execute(new AcceptInviteCommand('tok-1', 'user-2'), tx)

    expect(result).toEqual({ orgId: 'org-1', role: OrgRole.MEMBER })

    const savedMembership = mockMembershipRepo.save.mock.calls[0][0]
    expect(savedMembership.orgId).toBe('org-1')
    expect(savedMembership.userId).toBe('user-2')
    expect(savedMembership.role).toBe(OrgRole.MEMBER)

    expect(invite.isUsed()).toBe(true)
    expect(invite.usedBy).toBe('user-2')
    expect(mockInviteRepo.save).toHaveBeenCalledWith(invite)
  })

  // `{isMember:false}` is a cacheable answer (a completed lookup), so a
  // negative entry could lock the new member out of the org they just joined.
  it('drops the negative membership entry after commit', async () => {
    await handler.afterCommit(new AcceptInviteCommand('token-1', 'user-2'), {
      orgId: 'org-1',
      role: 'MEMBER',
    })

    expect(mockCache.del).toHaveBeenCalledWith('membership:org-1\u0000user-2')
  })
})
