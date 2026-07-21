import type { IOrgRolePermissionRepository } from '@/modules/tenant/domain/repositories/org-role-permission.repository'
import { OrgRole } from '@/modules/tenant/domain/org-rbac'
import { OrgPermissionResolver } from '@/modules/tenant/domain/services/resolve-org-permissions'
import { ALL_ORG_PERMISSIONS, OrgPermission } from '@distributed-social-platform/shared-kernel'
import { GetRolePermissionsHandler } from './get-role-permissions.handler'
import { GetRolePermissionsQuery } from './get-role-permissions.query'

describe('GetRolePermissionsHandler', () => {
  let handler: GetRolePermissionsHandler
  let mockRepo: jest.Mocked<IOrgRolePermissionRepository>

  beforeEach(() => {
    mockRepo = {
      seedDefaults: jest.fn(),
      replaceForRole: jest.fn(),
      findByOrg: jest.fn(),
      findByOrgAndRole: jest.fn(),
    } as unknown as jest.Mocked<IOrgRolePermissionRepository>

    // Real instance (not mocked) — OrgPermissionResolver.resolve() is a pure,
    // deterministic short-circuit for OWNER, no reason to fake it here.
    handler = new GetRolePermissionsHandler(mockRepo, new OrgPermissionResolver(mockRepo))
  })

  it('should always report OWNER as holding every permission (implicit-all), ignoring any stored OWNER rows', async () => {
    mockRepo.findByOrg.mockResolvedValueOnce([
      { role: OrgRole.OWNER, permission: OrgPermission.KNOWLEDGE_READ },
      { role: OrgRole.ADMIN, permission: OrgPermission.KNOWLEDGE_READ },
    ])

    const map = await handler.execute(new GetRolePermissionsQuery('org-1'))

    expect(map.OWNER).toEqual(ALL_ORG_PERMISSIONS)
    expect(map.ADMIN).toEqual([OrgPermission.KNOWLEDGE_READ])
  })

  it('should return empty arrays for roles with no mapping rows', async () => {
    mockRepo.findByOrg.mockResolvedValueOnce([])

    const map = await handler.execute(new GetRolePermissionsQuery('org-1'))

    expect(map.ADMIN).toEqual([])
    expect(map.MEMBER).toEqual([])
    expect(map.GUEST).toEqual([])
  })
})
