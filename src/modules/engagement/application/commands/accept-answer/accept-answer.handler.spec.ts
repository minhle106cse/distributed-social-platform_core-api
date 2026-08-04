import type { CoreApiRepos } from '@/infrastructure/database/prisma/core-api-repos.factory'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import { KnowledgeItem } from '@/modules/knowledge/domain/entities/knowledge-item.entity'
import { KnowledgeItemNotFoundError } from '@/common/errors/knowledge.error'
import {
  NotAQuestionError,
  NotAnAnswerError,
  AnswerNotForQuestionError,
  AcceptAnswerForbiddenError,
} from '@/common/errors/engagement.error'
import { AcceptAnswerHandler } from './accept-answer.handler'
import { AcceptAnswerCommand } from './accept-answer.command'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

function buildItem(overrides: Partial<Parameters<typeof KnowledgeItem.create>[0]> = {}) {
  return KnowledgeItem.create({
    orgId: 'org-1',
    spaceId: 'space-1',
    type: 'QUESTION',
    title: 'How to deploy?',
    body: '...',
    createdByUserId: 'author-1',
    ...overrides,
  })
}

describe('AcceptAnswerHandler', () => {
  let handler: AcceptAnswerHandler
  let tx: CoreApiRepos
  let mockItemRepo: jest.Mocked<IKnowledgeItemRepository>

  beforeEach(() => {
    mockItemRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      updateWithOcc: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IKnowledgeItemRepository>

    handler = new AcceptAnswerHandler()
    tx = { items: mockItemRepo } as unknown as CoreApiRepos
  })

  it('should throw KnowledgeItemNotFoundError when the question does not exist', async () => {
    mockItemRepo.findById.mockResolvedValueOnce(null)

    await expect(
      handler.execute(new AcceptAnswerCommand('missing-q', 'answer-1', 'author-1'), tx),
    ).rejects.toThrow(KnowledgeItemNotFoundError)
  })

  it('should throw NotAQuestionError when the "question" item is not actually a QUESTION', async () => {
    mockItemRepo.findById.mockResolvedValueOnce(buildItem({ type: 'DOCUMENT' }))

    await expect(
      handler.execute(new AcceptAnswerCommand('doc-1', 'answer-1', 'author-1'), tx),
    ).rejects.toThrow(NotAQuestionError)
  })

  it('should throw AcceptAnswerForbiddenError when the actor is not the question author', async () => {
    mockItemRepo.findById.mockResolvedValueOnce(buildItem())

    await expect(
      handler.execute(new AcceptAnswerCommand('q-1', 'answer-1', 'someone-else'), tx),
    ).rejects.toThrow(AcceptAnswerForbiddenError)
  })

  it('should throw KnowledgeItemNotFoundError when the answer does not exist', async () => {
    const question = buildItem()
    mockItemRepo.findById.mockResolvedValueOnce(question).mockResolvedValueOnce(null)

    await expect(
      handler.execute(new AcceptAnswerCommand('q-1', 'missing-answer', 'author-1'), tx),
    ).rejects.toThrow(KnowledgeItemNotFoundError)
  })

  it('should throw NotAnAnswerError when the target is not actually an ANSWER', async () => {
    const question = buildItem()
    const notAnAnswer = buildItem({ type: 'DOCUMENT', createdByUserId: 'user-2' })
    mockItemRepo.findById.mockResolvedValueOnce(question).mockResolvedValueOnce(notAnAnswer)

    await expect(
      handler.execute(new AcceptAnswerCommand('q-1', 'not-answer', 'author-1'), tx),
    ).rejects.toThrow(NotAnAnswerError)
  })

  it('should throw AnswerNotForQuestionError when the answer belongs to a different question', async () => {
    const question = buildItem()
    const answerForOtherQuestion = buildItem({
      type: 'ANSWER',
      createdByUserId: 'user-2',
      parentId: 'some-other-question',
    })
    mockItemRepo.findById
      .mockResolvedValueOnce(question)
      .mockResolvedValueOnce(answerForOtherQuestion)

    await expect(
      handler.execute(new AcceptAnswerCommand('q-1', 'answer-1', 'author-1'), tx),
    ).rejects.toThrow(AnswerNotForQuestionError)
  })

  it('should accept the answer when every invariant holds', async () => {
    const question = buildItem()
    const answer = buildItem({ type: 'ANSWER', createdByUserId: 'user-2', parentId: question.id })
    mockItemRepo.findById.mockResolvedValueOnce(question).mockResolvedValueOnce(answer)

    await handler.execute(new AcceptAnswerCommand(question.id, answer.id, 'author-1'), tx)

    expect(question.acceptedAnswerId).toBe(answer.id)
    expect(mockItemRepo.update).toHaveBeenCalledWith(question)
  })
})
