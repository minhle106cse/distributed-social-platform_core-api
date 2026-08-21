import type { IKnowledgeQueryRepository } from '../../repositories/knowledge.query-repository'
import { KnowledgeItemNotFoundError } from '@/common/errors/knowledge.error'
import { GetKnowledgeItemHandler } from './get-knowledge-item.handler'
import { GetKnowledgeItemQuery } from './get-knowledge-item.query'

describe('GetKnowledgeItemHandler', () => {
  let handler: GetKnowledgeItemHandler
  let mockQueryRepo: jest.Mocked<IKnowledgeQueryRepository>

  beforeEach(() => {
    mockQueryRepo = {
      findItemById: jest.fn(),
      findItems: jest.fn(),
      findRevisionsByItemId: jest.fn(),
    } as unknown as jest.Mocked<IKnowledgeQueryRepository>

    handler = new GetKnowledgeItemHandler(mockQueryRepo)
  })

  it('should throw KnowledgeItemNotFoundError when the query repository finds nothing for that org', async () => {
    mockQueryRepo.findItemById.mockResolvedValueOnce(null)

    await expect(handler.execute(new GetKnowledgeItemQuery('item-1', 'org-1'))).rejects.toThrow(
      KnowledgeItemNotFoundError,
    )
  })

  it('should return the item scoped by both id and orgId (tenant isolation)', async () => {
    mockQueryRepo.findItemById.mockResolvedValueOnce({ id: 'item-1', title: 'T' } as never)

    const result = await handler.execute(new GetKnowledgeItemQuery('item-1', 'org-1'))

    expect(mockQueryRepo.findItemById).toHaveBeenCalledWith('item-1', 'org-1')
    expect(result).toEqual({ id: 'item-1', title: 'T' })
  })
})
