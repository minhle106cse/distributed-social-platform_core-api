import type { CoreApiRepos } from '@/infrastructure/database/prisma/core-api-repos.factory'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import { CreateKnowledgeHandler } from './create-knowledge.handler'
import { CreateKnowledgeCommand } from './create-knowledge.command'

describe('CreateKnowledgeHandler', () => {
  let handler: CreateKnowledgeHandler
  let tx: CoreApiRepos
  let mockItemRepo: jest.Mocked<IKnowledgeItemRepository>

  beforeEach(() => {
    mockItemRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      updateWithOcc: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IKnowledgeItemRepository>

    handler = new CreateKnowledgeHandler()
    tx = { items: mockItemRepo } as unknown as CoreApiRepos
  })

  it('should create a DRAFT knowledge item and return its id', async () => {
    const command = new CreateKnowledgeCommand(
      'org-1',
      'space-1',
      'DOCUMENT',
      'Onboarding Guide',
      'Step 1...',
      null,
      'user-1',
    )

    const itemId = await handler.execute(command, tx)

    expect(mockItemRepo.save).toHaveBeenCalledTimes(1)
    const savedItem = mockItemRepo.save.mock.calls[0][0]
    expect(savedItem.id).toBe(itemId)
    expect(savedItem.status).toBe('DRAFT')
    expect(savedItem.orgId).toBe('org-1')
  })
})
