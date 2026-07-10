import type { IMembershipQueryRepository } from '../membership.query-repository'
import { GetOrgMembersHandler } from './get-org-members.handler'
import { GetOrgMembersQuery } from './get-org-members.query'

describe('GetOrgMembersHandler', () => {
  let handler: GetOrgMembersHandler
  let mockQueryRepo: jest.Mocked<IMembershipQueryRepository>

  beforeEach(() => {
    mockQueryRepo = {
      findMembersByOrgId: jest.fn(),
      findOrgsByUserId: jest.fn(),
    } as unknown as jest.Mocked<IMembershipQueryRepository>

    handler = new GetOrgMembersHandler(mockQueryRepo)
  })

  it('should forward orgId/limit/offset to the query repository as-is', async () => {
    mockQueryRepo.findMembersByOrgId.mockResolvedValueOnce([
      { userId: 'user-1', role: 'OWNER' } as never,
    ])

    const result = await handler.execute(new GetOrgMembersQuery('org-1', 25, 50))

    expect(mockQueryRepo.findMembersByOrgId).toHaveBeenCalledWith('org-1', 25, 50)
    expect(result).toEqual([{ userId: 'user-1', role: 'OWNER' }])
  })

  it('should apply the query default limit/offset when not specified by the caller', async () => {
    mockQueryRepo.findMembersByOrgId.mockResolvedValueOnce([])

    await handler.execute(new GetOrgMembersQuery('org-1'))

    expect(mockQueryRepo.findMembersByOrgId).toHaveBeenCalledWith('org-1', 50, 0)
  })
})
