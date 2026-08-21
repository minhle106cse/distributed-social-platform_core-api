import type { IMembershipQueryRepository } from '../../repositories/membership.query-repository'
import { ListMyOrgsHandler } from './list-my-orgs.handler'
import { ListMyOrgsQuery } from './list-my-orgs.query'

describe('ListMyOrgsHandler', () => {
  let handler: ListMyOrgsHandler
  let mockQueryRepo: jest.Mocked<IMembershipQueryRepository>

  beforeEach(() => {
    mockQueryRepo = {
      findMembersByOrgId: jest.fn(),
      findOrgsByUserId: jest.fn(),
    } as unknown as jest.Mocked<IMembershipQueryRepository>

    handler = new ListMyOrgsHandler(mockQueryRepo)
  })

  it('should return only the orgs the given user belongs to (tenant-safe by construction)', async () => {
    mockQueryRepo.findOrgsByUserId.mockResolvedValueOnce([
      { orgId: 'org-1', role: 'OWNER' } as never,
    ])

    const result = await handler.execute(new ListMyOrgsQuery('user-1'))

    expect(mockQueryRepo.findOrgsByUserId).toHaveBeenCalledWith('user-1')
    expect(result).toEqual([{ orgId: 'org-1', role: 'OWNER' }])
  })
})
