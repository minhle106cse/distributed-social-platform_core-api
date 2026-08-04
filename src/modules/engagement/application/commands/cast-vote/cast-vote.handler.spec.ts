import type { CoreApiRepos } from '@/infrastructure/database/prisma/core-api-repos.factory'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import type { IVoteRepository } from '@/modules/engagement/domain/repositories/vote.repository'
import { Vote } from '@/modules/engagement/domain/entities/vote.entity'
import { KnowledgeItemNotFoundError } from '@/common/errors/knowledge.error'
import { CastVoteHandler } from './cast-vote.handler'
import { CastVoteCommand } from './cast-vote.command'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('CastVoteHandler', () => {
  let handler: CastVoteHandler
  let tx: CoreApiRepos
  let mockItemRepo: jest.Mocked<IKnowledgeItemRepository>
  let mockVoteRepo: jest.Mocked<IVoteRepository>

  beforeEach(() => {
    mockItemRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      updateWithOcc: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IKnowledgeItemRepository>

    mockVoteRepo = {
      findByItemAndUser: jest.fn(),
      upsert: jest.fn(),
      removeByItemAndUser: jest.fn(),
    } as unknown as jest.Mocked<IVoteRepository>

    handler = new CastVoteHandler()
    tx = { items: mockItemRepo, votes: mockVoteRepo } as unknown as CoreApiRepos
  })

  it('should throw KnowledgeItemNotFoundError when the target item does not exist', async () => {
    mockItemRepo.findById.mockResolvedValueOnce(null)

    await expect(handler.execute(new CastVoteCommand('item-1', 'user-1', 1), tx)).rejects.toThrow(
      KnowledgeItemNotFoundError,
    )
  })

  it('should create a new vote when the user has not voted on this item yet', async () => {
    mockItemRepo.findById.mockResolvedValueOnce({ orgId: 'org-1' } as never)
    mockVoteRepo.findByItemAndUser.mockResolvedValueOnce(null)

    await handler.execute(new CastVoteCommand('item-1', 'user-1', 1), tx)

    const upserted = mockVoteRepo.upsert.mock.calls[0][0]
    expect(upserted.orgId).toBe('org-1')
    expect(upserted.value).toBe(1)
  })

  it('should change the value in place (not create a duplicate) when the user already voted', async () => {
    mockItemRepo.findById.mockResolvedValueOnce({ orgId: 'org-1' } as never)
    const existingVote = Vote.create({
      orgId: 'org-1',
      itemId: 'item-1',
      userId: 'user-1',
      value: 1,
    })
    mockVoteRepo.findByItemAndUser.mockResolvedValueOnce(existingVote)

    await handler.execute(new CastVoteCommand('item-1', 'user-1', -1), tx)

    expect(existingVote.value).toBe(-1)
    expect(mockVoteRepo.upsert).toHaveBeenCalledWith(existingVote)
    expect(mockVoteRepo.upsert).toHaveBeenCalledTimes(1)
  })
})
