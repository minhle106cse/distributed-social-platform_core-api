import type { ISystemAdminQueryRepository } from '../../repositories/system-admin.query-repository'
import { ListAllOrgsHandler } from './list-all-orgs.handler'
import { ListAllOrgsQuery } from './list-all-orgs.query'

describe('ListAllOrgsHandler', () => {
  let handler: ListAllOrgsHandler
  let mockQueryRepo: jest.Mocked<ISystemAdminQueryRepository>

  beforeEach(() => {
    mockQueryRepo = {
      listAllOrgs: jest.fn(),
    } as unknown as jest.Mocked<ISystemAdminQueryRepository>

    handler = new ListAllOrgsHandler(mockQueryRepo)
  })

  it('should forward limit/offset to the platform-wide (non-tenant-filtered) query repository as-is', async () => {
    mockQueryRepo.listAllOrgs.mockResolvedValueOnce([{ id: 'org-1', name: 'Acme' } as never])

    const result = await handler.execute(new ListAllOrgsQuery(25, 50))

    expect(mockQueryRepo.listAllOrgs).toHaveBeenCalledWith(25, 50)
    expect(result).toEqual([{ id: 'org-1', name: 'Acme' }])
  })
})
