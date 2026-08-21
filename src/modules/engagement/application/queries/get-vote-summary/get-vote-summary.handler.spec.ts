import type { IEngagementQueryRepository } from '../../repositories/engagement.query-repository'
import { GetVoteSummaryHandler } from './get-vote-summary.handler'
import { GetVoteSummaryQuery } from './get-vote-summary.query'

describe('GetVoteSummaryHandler', () => {
  let handler: GetVoteSummaryHandler
  let mockQueryRepo: jest.Mocked<IEngagementQueryRepository>

  beforeEach(() => {
    mockQueryRepo = {
      getVoteSummary: jest.fn(),
      listBookmarks: jest.fn(),
      listFollows: jest.fn(),
    } as unknown as jest.Mocked<IEngagementQueryRepository>

    handler = new GetVoteSummaryHandler(mockQueryRepo)
  })

  it('should forward itemId/orgId/userId to the query repository', async () => {
    mockQueryRepo.getVoteSummary.mockResolvedValueOnce({ score: 5, myVote: 1 } as never)

    const result = await handler.execute(new GetVoteSummaryQuery('item-1', 'org-1', 'user-1'))

    expect(mockQueryRepo.getVoteSummary).toHaveBeenCalledWith('item-1', 'org-1', 'user-1')
    expect(result).toEqual({ score: 5, myVote: 1 })
  })
})
