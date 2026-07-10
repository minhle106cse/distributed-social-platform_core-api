import type { IMembershipRepository } from '@/modules/tenant/domain/repositories/membership.repository'
import { Membership } from '@/modules/tenant/domain/entities/membership.entity'
import { OrgRole } from '@/modules/tenant/domain/org-rbac'
import { MembershipNotFoundError } from '@/common/errors/tenant.error'
import { UpdateMemberRoleHandler } from './update-member-role.handler'
import { UpdateMemberRoleCommand } from './update-member-role.command'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('UpdateMemberRoleHandler', () => {
  let handler: UpdateMemberRoleHandler
  let mockMembershipRepo: jest.Mocked<IMembershipRepository>

  beforeEach(() => {
    mockMembershipRepo = {
      findByOrgAndUser: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<IMembershipRepository>

    handler = new UpdateMemberRoleHandler(mockMembershipRepo)
  })

  it('should throw MembershipNotFoundError when the target user is not a member of the org', async () => {
    mockMembershipRepo.findByOrgAndUser.mockResolvedValueOnce(null)

    await expect(
      handler.execute(new UpdateMemberRoleCommand('org-1', 'user-2', OrgRole.ADMIN)),
    ).rejects.toThrow(MembershipNotFoundError)
    expect(mockMembershipRepo.save).not.toHaveBeenCalled()
  })

  it('should re-grade the membership to the new role and persist it', async () => {
    const membership = Membership.createMember({
      orgId: 'org-1',
      userId: 'user-2',
      role: OrgRole.GUEST,
    })
    mockMembershipRepo.findByOrgAndUser.mockResolvedValueOnce(membership)

    await handler.execute(new UpdateMemberRoleCommand('org-1', 'user-2', OrgRole.ADMIN))

    expect(membership.role).toBe(OrgRole.ADMIN)
    expect(mockMembershipRepo.save).toHaveBeenCalledWith(membership)
  })
})
