import type { IOrgRolePermissionRepository } from '@/modules/tenant/domain/repositories/org-role-permission.repository'
import { OrgRole } from '@/modules/tenant/domain/org-rbac'
import { OrgPermission } from '@distributed-social-platform/shared-kernel'
import {
  CannotModifyOwnerPermissionsError,
  InvalidOrgPermissionError,
} from '@/common/errors/tenant.error'
import { UpdateRolePermissionsHandler } from './update-role-permissions.handler'
import { UpdateRolePermissionsCommand } from './update-role-permissions.command'

describe('UpdateRolePermissionsHandler', () => {
  let handler: UpdateRolePermissionsHandler
  let mockRepo: jest.Mocked<IOrgRolePermissionRepository>

  beforeEach(() => {
    mockRepo = {
      seedDefaults: jest.fn(),
      replaceForRole: jest.fn(),
      findByOrg: jest.fn(),
      findByOrgAndRole: jest.fn(),
    } as unknown as jest.Mocked<IOrgRolePermissionRepository>

    handler = new UpdateRolePermissionsHandler(mockRepo)
  })

  it('should throw CannotModifyOwnerPermissionsError — the anti-lockout guardrail — when targeting OWNER', async () => {
    const command = new UpdateRolePermissionsCommand('org-1', OrgRole.OWNER, [
      OrgPermission.KNOWLEDGE_READ,
    ])

    await expect(handler.execute(command)).rejects.toThrow(CannotModifyOwnerPermissionsError)
    expect(mockRepo.replaceForRole).not.toHaveBeenCalled()
  })

  it('should throw InvalidOrgPermissionError for a permission outside the closed catalog', async () => {
    const command = new UpdateRolePermissionsCommand('org-1', OrgRole.ADMIN, ['not:a-real-permission'])

    await expect(handler.execute(command)).rejects.toThrow(InvalidOrgPermissionError)
    expect(mockRepo.replaceForRole).not.toHaveBeenCalled()
  })

  it('should de-duplicate permissions before replacing the role mapping', async () => {
    const command = new UpdateRolePermissionsCommand('org-1', OrgRole.ADMIN, [
      OrgPermission.KNOWLEDGE_READ,
      OrgPermission.KNOWLEDGE_READ,
      OrgPermission.KNOWLEDGE_WRITE,
    ])

    await handler.execute(command)

    expect(mockRepo.replaceForRole).toHaveBeenCalledWith('org-1', OrgRole.ADMIN, [
      OrgPermission.KNOWLEDGE_READ,
      OrgPermission.KNOWLEDGE_WRITE,
    ])
  })
})
