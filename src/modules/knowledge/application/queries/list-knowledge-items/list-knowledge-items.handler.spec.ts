import type { IKnowledgeQueryRepository } from '../../repositories/knowledge.query-repository'
import { ListKnowledgeItemsHandler } from './list-knowledge-items.handler'
import { ListKnowledgeItemsQuery } from './list-knowledge-items.query'

describe('ListKnowledgeItemsHandler', () => {
  let handler: ListKnowledgeItemsHandler
  let mockQueryRepo: jest.Mocked<IKnowledgeQueryRepository>

  beforeEach(() => {
    mockQueryRepo = {
      findItemById: jest.fn(),
      findItems: jest.fn(),
      findRevisionsByItemId: jest.fn(),
    }

    handler = new ListKnowledgeItemsHandler(mockQueryRepo)
  })

  it('should forward the full filter (org/space/type/status/pagination) to the query repository', async () => {
    mockQueryRepo.findItems.mockResolvedValueOnce([{ id: 'item-1' } as never])

    const query = new ListKnowledgeItemsQuery('org-1', 'space-1', 'DOCUMENT', 'PUBLISHED', 25, 0)
    const result = await handler.execute(query)

    expect(mockQueryRepo.findItems).toHaveBeenCalledWith({
      orgId: 'org-1',
      spaceId: 'space-1',
      type: 'DOCUMENT',
      status: 'PUBLISHED',
      limit: 25,
      offset: 0,
    })
    expect(result).toEqual([{ id: 'item-1' }])
  })
})
