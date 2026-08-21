import type { CoreApiRepos } from '@/common/database/core-api-repos'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import { KnowledgeItem } from '@/modules/knowledge/domain/entities/knowledge-item.entity'
import { KnowledgeItemNotFoundError } from '@/common/errors/knowledge.error'
import { DeleteKnowledgeHandler } from './delete-knowledge.handler'
import { DeleteKnowledgeCommand } from './delete-knowledge.command'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('DeleteKnowledgeHandler', () => {
  let handler: DeleteKnowledgeHandler
  let tx: CoreApiRepos
  let mockItemRepo: jest.Mocked<IKnowledgeItemRepository>

  beforeEach(() => {
    mockItemRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      updateWithOcc: jest.fn(),
      update: jest.fn(),
    }

    handler = new DeleteKnowledgeHandler()
    tx = { items: mockItemRepo } as unknown as CoreApiRepos
  })

  it('should throw KnowledgeItemNotFoundError when the item does not exist', async () => {
    mockItemRepo.findById.mockResolvedValueOnce(null)

    await expect(handler.execute(new DeleteKnowledgeCommand('missing-id'), tx)).rejects.toThrow(
      KnowledgeItemNotFoundError,
    )
  })

  it('should soft-delete the item (not hard-delete) and persist it', async () => {
    const item = KnowledgeItem.create({
      orgId: 'org-1',
      spaceId: 'space-1',
      type: 'DOCUMENT',
      title: 'T',
      body: 'B',
      createdByUserId: 'user-1',
    })
    mockItemRepo.findById.mockResolvedValueOnce(item)

    await handler.execute(new DeleteKnowledgeCommand('item-1'), tx)

    expect(item.isDeleted).toBe(true)
    expect(mockItemRepo.update).toHaveBeenCalledWith(item)
  })
})
