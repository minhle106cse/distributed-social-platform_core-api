import type { CoreApiRepos } from '@/common/database/core-api-repos'
import type { IOrganizationRepository } from '@/modules/tenant/domain/repositories/organization.repository'
import { Organization } from '@/modules/tenant/domain/entities/organization.entity'
import { OrgNotFoundError } from '@/modules/tenant/domain/tenant.error'
import { ArchiveOrgHandler } from './archive-org.handler'
import { ArchiveOrgCommand } from './archive-org.command'

describe('ArchiveOrgHandler', () => {
  let handler: ArchiveOrgHandler
  let tx: CoreApiRepos
  let mockOrgRepo: jest.Mocked<IOrganizationRepository>

  beforeEach(() => {
    mockOrgRepo = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      save: jest.fn(),
    }

    handler = new ArchiveOrgHandler()
    tx = { organizations: mockOrgRepo } as unknown as CoreApiRepos
  })

  it('should throw OrgNotFoundError when the org does not exist', async () => {
    mockOrgRepo.findById.mockResolvedValueOnce(null)

    await expect(handler.execute(new ArchiveOrgCommand('missing-id'), tx)).rejects.toThrow(
      OrgNotFoundError,
    )
  })

  it('should soft-delete the org (not hard-delete) and persist it', async () => {
    const org = Organization.create({ name: 'Acme', slug: 'acme' })
    mockOrgRepo.findById.mockResolvedValueOnce(org)

    await handler.execute(new ArchiveOrgCommand('org-1'), tx)

    expect(org.isDeleted).toBe(true)
    expect(mockOrgRepo.save).toHaveBeenCalledWith(org)
  })
})
