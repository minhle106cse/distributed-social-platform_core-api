import type { CoreApiRepos } from '@/infrastructure/database/prisma/core-api-repos.factory'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import type { IOutboxAppender } from '@/infrastructure/outbox/outbox.repository'
import { KnowledgeItem } from '@/modules/knowledge/domain/entities/knowledge-item.entity'
import {
  KnowledgeItemNotFoundError,
  InvalidKnowledgeStateError,
} from '@/common/errors/knowledge.error'
import { PublishKnowledgeHandler } from './publish-knowledge.handler'
import { PublishKnowledgeCommand } from './publish-knowledge.command'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('PublishKnowledgeHandler', () => {
  let handler: PublishKnowledgeHandler
  let tx: CoreApiRepos
  let mockItemRepo: jest.Mocked<IKnowledgeItemRepository>
  let mockOutboxRepo: jest.Mocked<IOutboxAppender>

  beforeEach(() => {
    mockItemRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      updateWithOcc: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IKnowledgeItemRepository>

    mockOutboxRepo = {
      append: jest.fn(),
    } as unknown as jest.Mocked<IOutboxAppender>

    handler = new PublishKnowledgeHandler()
    tx = { items: mockItemRepo, outbox: mockOutboxRepo } as unknown as CoreApiRepos
  })

  it('should throw KnowledgeItemNotFoundError when the item does not exist', async () => {
    mockItemRepo.findById.mockResolvedValueOnce(null)

    await expect(
      handler.execute(new PublishKnowledgeCommand('missing-id', 'user-1'), tx),
    ).rejects.toThrow(KnowledgeItemNotFoundError)
  })

  it('should throw InvalidKnowledgeStateError when the item is not DRAFT', async () => {
    const item = KnowledgeItem.create({
      orgId: 'org-1',
      spaceId: 'space-1',
      type: 'DOCUMENT',
      title: 'T',
      body: 'B',
      createdByUserId: 'user-1',
    })
    item.publish() // now PUBLISHED, already past DRAFT
    mockItemRepo.findById.mockResolvedValueOnce(item)

    await expect(
      handler.execute(new PublishKnowledgeCommand('item-1', 'user-1'), tx),
    ).rejects.toThrow(InvalidKnowledgeStateError)
    expect(mockOutboxRepo.append).not.toHaveBeenCalled()
  })

  it('should publish a DRAFT item and append a KNOWLEDGE_PUBLISHED outbox event carrying the org and content snapshot', async () => {
    const item = KnowledgeItem.create({
      orgId: 'org-1',
      spaceId: 'space-1',
      type: 'DOCUMENT',
      title: 'Onboarding Guide',
      body: 'Step 1...',
      createdByUserId: 'user-1',
    })
    mockItemRepo.findById.mockResolvedValueOnce(item)

    await handler.execute(new PublishKnowledgeCommand('item-1', 'user-1'), tx)

    expect(item.status).toBe('PUBLISHED')
    expect(mockItemRepo.update).toHaveBeenCalledWith(item)

    const appended = mockOutboxRepo.append.mock.calls[0][0]
    expect(appended).toMatchObject({
      aggregateId: item.id,
      orgId: 'org-1',
      payload: expect.objectContaining({
        itemId: item.id,
        spaceId: 'space-1',
        title: 'Onboarding Guide',
      }),
    })
  })
})
