import type { PinoLogger } from 'nestjs-pino'
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
  let mockLogger: jest.Mocked<PinoLogger>

  beforeEach(() => {
    mockMembershipRepo = {
      findByOrgAndUser: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<IMembershipRepository>

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>

    handler = new UpdateMemberRoleHandler(mockMembershipRepo, mockLogger)
  })

  it('should throw MembershipNotFoundError when the target user is not a member of the org', async () => {
    mockMembershipRepo.findByOrgAndUser.mockResolvedValueOnce(null)

    await expect(
      handler.execute(new UpdateMemberRoleCommand('org-1', 'user-2', OrgRole.ADMIN, 'actor-1')),
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

    await handler.execute(new UpdateMemberRoleCommand('org-1', 'user-2', OrgRole.ADMIN, 'actor-1'))

    expect(membership.role).toBe(OrgRole.ADMIN)
    expect(mockMembershipRepo.save).toHaveBeenCalledWith(membership)
  })

  it('should audit-log the role change with actor, target, and before/after role', async () => {
    const membership = Membership.createMember({
      orgId: 'org-1',
      userId: 'user-2',
      role: OrgRole.GUEST,
    })
    mockMembershipRepo.findByOrgAndUser.mockResolvedValueOnce(membership)

    await handler.execute(new UpdateMemberRoleCommand('org-1', 'user-2', OrgRole.ADMIN, 'actor-1'))

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        context: 'AuditLog',
        action: 'org.member_role_updated',
        actorUserId: 'actor-1',
        targetUserId: 'user-2',
        metadata: { orgId: 'org-1', previousRole: OrgRole.GUEST, newRole: OrgRole.ADMIN },
      }),
      expect.any(String),
    )
  })
})
