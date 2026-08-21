import type { CoreApiRepos } from '@/common/database/core-api-repos'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import type { IRevisionRepository } from '@/modules/knowledge/domain/repositories/revision.repository'
import { KnowledgeItem } from '@/modules/knowledge/domain/entities/knowledge-item.entity'
import {
  KnowledgeItemNotFoundError,
  KnowledgeVersionConflictError,
} from '@/common/errors/knowledge.error'
import { UpdateKnowledgeHandler } from './update-knowledge.handler'
import { UpdateKnowledgeCommand } from './update-knowledge.command'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('UpdateKnowledgeHandler', () => {
  let handler: UpdateKnowledgeHandler
  let tx: CoreApiRepos
  let mockItemRepo: jest.Mocked<IKnowledgeItemRepository>
  let mockRevisionRepo: jest.Mocked<IRevisionRepository>

  beforeEach(() => {
    mockItemRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      updateWithOcc: jest.fn(),
      update: jest.fn(),
    }

    mockRevisionRepo = {
      save: jest.fn(),
    }

    handler = new UpdateKnowledgeHandler()
    tx = { items: mockItemRepo, revisions: mockRevisionRepo } as unknown as CoreApiRepos
  })

  function buildItem() {
    return KnowledgeItem.create({
      orgId: 'org-1',
      spaceId: 'space-1',
      type: 'DOCUMENT',
      title: 'Original',
      body: 'original body',
      createdByUserId: 'user-1',
    })
  }

  it('should throw KnowledgeItemNotFoundError when the item does not exist', async () => {
    mockItemRepo.findById.mockResolvedValueOnce(null)

    await expect(
      handler.execute(new UpdateKnowledgeCommand('missing-id', 1, 'T', 'B', 'user-1'), tx),
    ).rejects.toThrow(KnowledgeItemNotFoundError)
  })

  it('should throw KnowledgeVersionConflictError and NOT create a revision when the OCC write loses the race', async () => {
    mockItemRepo.findById.mockResolvedValueOnce(buildItem())
    mockItemRepo.updateWithOcc.mockResolvedValueOnce(false)

    await expect(
      handler.execute(
        new UpdateKnowledgeCommand('item-1', 1, 'New Title', 'New body', 'user-2'),
        tx,
      ),
    ).rejects.toThrow(KnowledgeVersionConflictError)

    expect(mockRevisionRepo.save).not.toHaveBeenCalled()
  })

  it('should bump the version, persist via OCC, and snapshot a Revision on success', async () => {
    const item = buildItem()
    mockItemRepo.findById.mockResolvedValueOnce(item)
    mockItemRepo.updateWithOcc.mockResolvedValueOnce(true)

    await handler.execute(
      new UpdateKnowledgeCommand('item-1', 1, 'New Title', 'New body', 'user-2'),
      tx,
    )

    expect(item.version).toBe(2)
    expect(mockItemRepo.updateWithOcc).toHaveBeenCalledWith(item, 1)

    const savedRevision = mockRevisionRepo.save.mock.calls[0][0]
    expect(savedRevision.version).toBe(2)
    expect(savedRevision.bodySnapshot).toBe('New body')
    expect(savedRevision.editedByUserId).toBe('user-2')
  })
})
