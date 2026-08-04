import type { CoreApiRepos } from '@/infrastructure/database/prisma/core-api-repos.factory'
import type { IOrgInviteRepository } from '@/modules/tenant/domain/repositories/org-invite.repository'
import type { IMembershipRepository } from '@/modules/tenant/domain/repositories/membership.repository'
import { OrgInvite } from '@/modules/tenant/domain/entities/org-invite.entity'
import { OrgRole } from '@/modules/tenant/domain/org-rbac'
import {
  InviteNotFoundError,
  InviteExpiredError,
  InviteAlreadyUsedError,
  AlreadyMemberError,
} from '@/common/errors/tenant.error'
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
  let handler: AcceptInviteHandler
  let tx: CoreApiRepos
  let mockInviteRepo: jest.Mocked<IOrgInviteRepository>
  let mockMembershipRepo: jest.Mocked<IMembershipRepository>

  beforeEach(() => {
    mockInviteRepo = {
      save: jest.fn(),
      findByToken: jest.fn(),
    } as unknown as jest.Mocked<IOrgInviteRepository>

    mockMembershipRepo = {
      findByOrgAndUser: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<IMembershipRepository>

    handler = new AcceptInviteHandler()
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
})
