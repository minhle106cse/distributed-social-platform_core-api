import type { CoreApiRepos } from '@/common/database/core-api-repos'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import { KnowledgeItem } from '@/modules/knowledge/domain/entities/knowledge-item.entity'
import { KnowledgeItemNotFoundError } from '@/common/errors/knowledge.error'
import { VerifyKnowledgeHandler } from './verify-knowledge.handler'
import { VerifyKnowledgeCommand } from './verify-knowledge.command'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('VerifyKnowledgeHandler', () => {
  let handler: VerifyKnowledgeHandler
  let tx: CoreApiRepos
  let mockItemRepo: jest.Mocked<IKnowledgeItemRepository>

  beforeEach(() => {
    mockItemRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      updateWithOcc: jest.fn(),
      update: jest.fn(),
    }

    handler = new VerifyKnowledgeHandler()
    tx = { items: mockItemRepo } as unknown as CoreApiRepos
  })

  it('should throw KnowledgeItemNotFoundError when the item does not exist', async () => {
    mockItemRepo.findById.mockResolvedValueOnce(null)

    await expect(
      handler.execute(new VerifyKnowledgeCommand('missing-id', 'verifier-1'), tx),
    ).rejects.toThrow(KnowledgeItemNotFoundError)
  })

  it('should mark the item verified, stamped with the verifier, and persist it', async () => {
    const item = KnowledgeItem.create({
      orgId: 'org-1',
      spaceId: 'space-1',
      type: 'DOCUMENT',
      title: 'T',
      body: 'B',
      createdByUserId: 'user-1',
    })
    mockItemRepo.findById.mockResolvedValueOnce(item)

    await handler.execute(new VerifyKnowledgeCommand('item-1', 'verifier-1'), tx)

    expect(item.isVerified).toBe(true)
    expect(item.updatedByUserId).toBe('verifier-1')
    expect(mockItemRepo.update).toHaveBeenCalledWith(item)
  })
})
