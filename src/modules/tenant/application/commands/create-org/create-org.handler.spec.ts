import type { CoreApiRepos } from '@/infrastructure/database/prisma/core-api-repos.factory'
import type { IOrganizationRepository } from '@/modules/tenant/domain/repositories/organization.repository'
import type { IMembershipRepository } from '@/modules/tenant/domain/repositories/membership.repository'
import type { IOrgRolePermissionRepository } from '@/modules/tenant/domain/repositories/org-role-permission.repository'
import { OrgSlugAlreadyTakenError } from '@/common/errors/tenant.error'
import { OrgRole } from '@/modules/tenant/domain/org-rbac'
import { CreateOrgHandler } from './create-org.handler'
import { CreateOrgCommand } from './create-org.command'

describe('CreateOrgHandler', () => {
  let handler: CreateOrgHandler
  let tx: CoreApiRepos
  let mockOrgRepo: jest.Mocked<IOrganizationRepository>
  let mockMembershipRepo: jest.Mocked<IMembershipRepository>
  let mockRolePermissionRepo: jest.Mocked<IOrgRolePermissionRepository>

  beforeEach(() => {
    mockOrgRepo = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<IOrganizationRepository>

    mockMembershipRepo = {
      findByOrgAndUser: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<IMembershipRepository>

    mockRolePermissionRepo = {
      seedDefaults: jest.fn(),
      replaceForRole: jest.fn(),
      findByOrg: jest.fn(),
      findByOrgAndRole: jest.fn(),
    } as unknown as jest.Mocked<IOrgRolePermissionRepository>

    handler = new CreateOrgHandler()
    tx = {
      organizations: mockOrgRepo,
      memberships: mockMembershipRepo,
      rolePermissions: mockRolePermissionRepo,
    } as unknown as CoreApiRepos
  })

  it('should create the org, grant the caller OWNER, and seed default role permissions', async () => {
    mockOrgRepo.findBySlug.mockResolvedValueOnce(null)
    const command = new CreateOrgCommand('Acme', 'acme', 'user-1')

    const orgId = await handler.execute(command, tx)

    expect(mockOrgRepo.save).toHaveBeenCalledTimes(1)
    const savedOrg = mockOrgRepo.save.mock.calls[0][0]
    expect(savedOrg.id).toBe(orgId)

    expect(mockMembershipRepo.save).toHaveBeenCalledTimes(1)
    const savedMembership = mockMembershipRepo.save.mock.calls[0][0]
    expect(savedMembership.orgId).toBe(orgId)
    expect(savedMembership.userId).toBe('user-1')
    expect(savedMembership.role).toBe(OrgRole.OWNER)

    expect(mockRolePermissionRepo.seedDefaults).toHaveBeenCalledWith(orgId)
  })

  it('should throw OrgSlugAlreadyTakenError and not persist anything when slug is taken', async () => {
    mockOrgRepo.findBySlug.mockResolvedValueOnce({ id: 'existing-org' } as never)
    const command = new CreateOrgCommand('Acme', 'acme', 'user-1')

    await expect(handler.execute(command, tx)).rejects.toThrow(OrgSlugAlreadyTakenError)

    expect(mockOrgRepo.save).not.toHaveBeenCalled()
    expect(mockMembershipRepo.save).not.toHaveBeenCalled()
    expect(mockRolePermissionRepo.seedDefaults).not.toHaveBeenCalled()
  })
})
