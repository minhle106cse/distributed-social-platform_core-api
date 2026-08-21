import type { IFeedQueryRepository } from '../../repositories/feed.query-repository'
import { GetFeedHandler } from './get-feed.handler'
import { GetFeedQuery } from './get-feed.query'

describe('GetFeedHandler', () => {
  let handler: GetFeedHandler
  let mockQueryRepo: jest.Mocked<IFeedQueryRepository>

  beforeEach(() => {
    mockQueryRepo = {
      getFeed: jest.fn(),
    }

    handler = new GetFeedHandler(mockQueryRepo)
  })

  it('should forward org/user/pagination to the feed read-model repository', async () => {
    mockQueryRepo.getFeed.mockResolvedValueOnce([{ itemId: 'item-1' } as never])

    const result = await handler.execute(new GetFeedQuery('org-1', 'user-1', 25, 0))

    expect(mockQueryRepo.getFeed).toHaveBeenCalledWith({
      orgId: 'org-1',
      userId: 'user-1',
      limit: 25,
      offset: 0,
    })
    expect(result).toEqual([{ itemId: 'item-1' }])
  })
})
