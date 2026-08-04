import type { CoreApiRepos } from '@/infrastructure/database/prisma/core-api-repos.factory'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import { KnowledgeItem } from '@/modules/knowledge/domain/entities/knowledge-item.entity'
import { KnowledgeItemNotFoundError } from '@/common/errors/knowledge.error'
import { NotAQuestionError, AcceptAnswerForbiddenError } from '@/common/errors/engagement.error'
import { UnacceptAnswerHandler } from './unaccept-answer.handler'
import { UnacceptAnswerCommand } from './unaccept-answer.command'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('UnacceptAnswerHandler', () => {
  let handler: UnacceptAnswerHandler
  let tx: CoreApiRepos
  let mockItemRepo: jest.Mocked<IKnowledgeItemRepository>

  beforeEach(() => {
    mockItemRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      updateWithOcc: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IKnowledgeItemRepository>

    handler = new UnacceptAnswerHandler()
    tx = { items: mockItemRepo } as unknown as CoreApiRepos
  })

  it('should throw KnowledgeItemNotFoundError when the question does not exist', async () => {
    mockItemRepo.findById.mockResolvedValueOnce(null)

    await expect(
      handler.execute(new UnacceptAnswerCommand('missing-q', 'author-1'), tx),
    ).rejects.toThrow(KnowledgeItemNotFoundError)
  })

  it('should throw NotAQuestionError when the item is not a QUESTION', async () => {
    const doc = KnowledgeItem.create({
      orgId: 'org-1',
      spaceId: 'space-1',
      type: 'DOCUMENT',
      title: 'T',
      body: 'B',
      createdByUserId: 'author-1',
    })
    mockItemRepo.findById.mockResolvedValueOnce(doc)

    await expect(
      handler.execute(new UnacceptAnswerCommand('doc-1', 'author-1'), tx),
    ).rejects.toThrow(NotAQuestionError)
  })

  it('should throw AcceptAnswerForbiddenError when the actor is not the question author', async () => {
    const question = KnowledgeItem.create({
      orgId: 'org-1',
      spaceId: 'space-1',
      type: 'QUESTION',
      title: 'T',
      body: 'B',
      createdByUserId: 'author-1',
    })
    mockItemRepo.findById.mockResolvedValueOnce(question)

    await expect(
      handler.execute(new UnacceptAnswerCommand('q-1', 'someone-else'), tx),
    ).rejects.toThrow(AcceptAnswerForbiddenError)
  })

  it('should clear the accepted answer when the actor is the question author', async () => {
    const question = KnowledgeItem.create({
      orgId: 'org-1',
      spaceId: 'space-1',
      type: 'QUESTION',
      title: 'T',
      body: 'B',
      createdByUserId: 'author-1',
    })
    question.acceptAnswer('answer-1')
    mockItemRepo.findById.mockResolvedValueOnce(question)

    await handler.execute(new UnacceptAnswerCommand('q-1', 'author-1'), tx)

    expect(question.acceptedAnswerId).toBeNull()
    expect(mockItemRepo.update).toHaveBeenCalledWith(question)
  })
})
