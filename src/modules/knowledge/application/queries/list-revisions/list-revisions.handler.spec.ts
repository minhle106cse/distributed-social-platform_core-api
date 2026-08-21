import type { IKnowledgeQueryRepository } from '../../repositories/knowledge.query-repository'
import { ListRevisionsHandler } from './list-revisions.handler'
import { ListRevisionsQuery } from './list-revisions.query'

describe('ListRevisionsHandler', () => {
  let handler: ListRevisionsHandler
  let mockQueryRepo: jest.Mocked<IKnowledgeQueryRepository>

  beforeEach(() => {
    mockQueryRepo = {
      findItemById: jest.fn(),
      findItems: jest.fn(),
      findRevisionsByItemId: jest.fn(),
    }

    handler = new ListRevisionsHandler(mockQueryRepo)
  })

  it('should forward itemId/orgId to the query repository (tenant isolation)', async () => {
    mockQueryRepo.findRevisionsByItemId.mockResolvedValueOnce([{ version: 1 } as never])

    const result = await handler.execute(new ListRevisionsQuery('item-1', 'org-1'))

    expect(mockQueryRepo.findRevisionsByItemId).toHaveBeenCalledWith('item-1', 'org-1')
    expect(result).toEqual([{ version: 1 }])
  })
})
