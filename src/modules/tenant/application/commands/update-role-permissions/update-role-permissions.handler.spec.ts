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
  const mockCache = { get: jest.fn(), set: jest.fn(), del: jest.fn() }

  let handler: UpdateRolePermissionsHandler
  let tx: CoreApiRepos
  let mockRepo: jest.Mocked<IOrgRolePermissionRepository>
  let mockLogger: jest.Mocked<PinoLogger>

  beforeEach(() => {
    mockCache.del.mockClear()
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

    handler = new UpdateRolePermissionsHandler(mockLogger, mockCache)
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

  // Without this, an OWNER's edit would not reach search-service /
  // notification-service for up to the 30s cache TTL — which defeats the point
  // of Org RBAC being editable at runtime.
  it('invalidates the ROLE permission entry after commit — one key, not one per member', async () => {
    const command = new UpdateRolePermissionsCommand(
      'org-1',
      OrgRole.MEMBER,
      ['knowledge:read'],
      'actor-1',
    )

    await handler.afterCommit(command)

    expect(mockCache.del).toHaveBeenCalledTimes(1)
    expect(mockCache.del).toHaveBeenCalledWith('org-permissions:org-1\u0000MEMBER')
  })
})
