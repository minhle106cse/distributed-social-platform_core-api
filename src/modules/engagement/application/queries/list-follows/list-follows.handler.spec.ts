import type { IEngagementQueryRepository } from '../../repositories/engagement.query-repository'
import { ListFollowsHandler } from './list-follows.handler'
import { ListFollowsQuery } from './list-follows.query'

describe('ListFollowsHandler', () => {
  let handler: ListFollowsHandler
  let mockQueryRepo: jest.Mocked<IEngagementQueryRepository>

  beforeEach(() => {
    mockQueryRepo = {
      getVoteSummary: jest.fn(),
      listBookmarks: jest.fn(),
      listFollows: jest.fn(),
    } as unknown as jest.Mocked<IEngagementQueryRepository>

    handler = new ListFollowsHandler(mockQueryRepo)
  })

  it('should forward org/user/pagination to the query repository', async () => {
    mockQueryRepo.listFollows.mockResolvedValueOnce([{ targetId: 'space-1' } as never])

    const result = await handler.execute(new ListFollowsQuery('org-1', 'user-1', 25, 0))

    expect(mockQueryRepo.listFollows).toHaveBeenCalledWith('org-1', 'user-1', 25, 0)
    expect(result).toEqual([{ targetId: 'space-1' }])
  })
})
