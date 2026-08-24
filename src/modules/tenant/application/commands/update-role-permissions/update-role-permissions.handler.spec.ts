import type { CoreApiRepos } from '@/common/database/core-api-repos'
import type { PinoLogger } from 'nestjs-pino'
import type { IOrgRolePermissionRepository } from '@/modules/tenant/domain/repositories/org-role-permission.repository'
import { OrgRole } from '@/modules/tenant/domain/org-rbac'
import { OrgPermission } from '@distributed-social-platform/shared-kernel'
import {
  CannotModifyOwnerPermissionsError,
  InvalidOrgPermissionError,
} from '@/modules/tenant/domain/tenant.error'
import { UpdateRolePermissionsHandler } from './update-role-permissions.handler'
import { UpdateRolePermissionsCommand } from './update-role-permissions.command'

describe('UpdateRolePermissionsHandler', () => {
  let handler: UpdateRolePermissionsHandler
  let tx: CoreApiRepos
  let mockRepo: jest.Mocked<IOrgRolePermissionRepository>
  let mockLogger: jest.Mocked<PinoLogger>

  beforeEach(() => {
    mockRepo = {
      seedDefaults: jest.fn(),
      replaceForRole: jest.fn(),
      findByOrg: jest.fn(),
      findByOrgAndRole: jest.fn(),
    }

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>

    handler = new UpdateRolePermissionsHandler(mockLogger)
    tx = { rolePermissions: mockRepo } as unknown as CoreApiRepos
  })

  it('should throw CannotModifyOwnerPermissionsError — the anti-lockout guardrail — when targeting OWNER', async () => {
    const command = new UpdateRolePermissionsCommand(
      'org-1',
      OrgRole.OWNER,
      [OrgPermission.KNOWLEDGE_READ],
      'actor-1',
    )

    await expect(handler.execute(command, tx)).rejects.toThrow(CannotModifyOwnerPermissionsError)
    expect(mockRepo.replaceForRole).not.toHaveBeenCalled()
  })

  it('should throw InvalidOrgPermissionError for a permission outside the closed catalog', async () => {
    const command = new UpdateRolePermissionsCommand(
      'org-1',
      OrgRole.ADMIN,
      ['not:a-real-permission'],
      'actor-1',
    )

    await expect(handler.execute(command, tx)).rejects.toThrow(InvalidOrgPermissionError)
    expect(mockRepo.replaceForRole).not.toHaveBeenCalled()
  })

  it('should de-duplicate permissions before replacing the role mapping', async () => {
    const command = new UpdateRolePermissionsCommand(
      'org-1',
      OrgRole.ADMIN,
      [OrgPermission.KNOWLEDGE_READ, OrgPermission.KNOWLEDGE_READ, OrgPermission.KNOWLEDGE_WRITE],
      'actor-1',
    )

    await handler.execute(command, tx)

    expect(mockRepo.replaceForRole).toHaveBeenCalledWith('org-1', OrgRole.ADMIN, [
      OrgPermission.KNOWLEDGE_READ,
      OrgPermission.KNOWLEDGE_WRITE,
    ])
  })

  it('should audit-log the permission set change with actor, role, and the deduplicated permissions', async () => {
    const command = new UpdateRolePermissionsCommand(
      'org-1',
      OrgRole.ADMIN,
      [OrgPermission.KNOWLEDGE_READ],
      'actor-1',
    )

    await handler.execute(command, tx)

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        context: 'AuditLog',
        action: 'org.role_permissions_updated',
        actorUserId: 'actor-1',
        metadata: {
          orgId: 'org-1',
          role: OrgRole.ADMIN,
          permissions: [OrgPermission.KNOWLEDGE_READ],
        },
      }),
      expect.any(String),
    )
  })
})
