import type { IEngagementQueryRepository } from '../../repositories/engagement.query-repository'
import { ListBookmarksHandler } from './list-bookmarks.handler'
import { ListBookmarksQuery } from './list-bookmarks.query'

describe('ListBookmarksHandler', () => {
  let handler: ListBookmarksHandler
  let mockQueryRepo: jest.Mocked<IEngagementQueryRepository>

  beforeEach(() => {
    mockQueryRepo = {
      getVoteSummary: jest.fn(),
      listBookmarks: jest.fn(),
      listFollows: jest.fn(),
    }

    handler = new ListBookmarksHandler(mockQueryRepo)
  })

  it('should forward org/user/pagination to the query repository', async () => {
    mockQueryRepo.listBookmarks.mockResolvedValueOnce([{ itemId: 'item-1' } as never])

    const result = await handler.execute(new ListBookmarksQuery('org-1', 'user-1', 25, 0))

    expect(mockQueryRepo.listBookmarks).toHaveBeenCalledWith('org-1', 'user-1', 25, 0)
    expect(result).toEqual([{ itemId: 'item-1' }])
  })
})
