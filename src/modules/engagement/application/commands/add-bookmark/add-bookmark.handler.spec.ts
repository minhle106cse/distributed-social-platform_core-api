import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import type { IBookmarkRepository } from '@/modules/engagement/domain/repositories/bookmark.repository'
import { KnowledgeItemNotFoundError } from '@/common/errors/knowledge.error'
import { AddBookmarkHandler } from './add-bookmark.handler'
import { AddBookmarkCommand } from './add-bookmark.command'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('AddBookmarkHandler', () => {
  let handler: AddBookmarkHandler
  let mockItemRepo: jest.Mocked<IKnowledgeItemRepository>
  let mockBookmarkRepo: jest.Mocked<IBookmarkRepository>

  beforeEach(() => {
    mockItemRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      updateWithOcc: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IKnowledgeItemRepository>

    mockBookmarkRepo = {
      add: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<IBookmarkRepository>

    handler = new AddBookmarkHandler(mockItemRepo, mockBookmarkRepo)
  })

  it('should throw KnowledgeItemNotFoundError when the item does not exist', async () => {
    mockItemRepo.findById.mockResolvedValueOnce(null)

    await expect(handler.execute(new AddBookmarkCommand('missing-item', 'user-1'))).rejects.toThrow(
      KnowledgeItemNotFoundError,
    )
  })

  it('should create a bookmark scoped to the item org', async () => {
    mockItemRepo.findById.mockResolvedValueOnce({ orgId: 'org-1' } as never)

    await handler.execute(new AddBookmarkCommand('item-1', 'user-1'))

    const savedBookmark = mockBookmarkRepo.add.mock.calls[0][0]
    expect(savedBookmark.orgId).toBe('org-1')
    expect(savedBookmark.userId).toBe('user-1')
    expect(savedBookmark.itemId).toBe('item-1')
  })
})
