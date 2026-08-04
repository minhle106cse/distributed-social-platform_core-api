import type { CoreApiRepos } from '@/infrastructure/database/prisma/core-api-repos.factory'
import type { IVoteRepository } from '@/modules/engagement/domain/repositories/vote.repository'
import { RemoveVoteHandler } from './remove-vote.handler'
import { RemoveVoteCommand } from './remove-vote.command'

describe('RemoveVoteHandler', () => {
  let handler: RemoveVoteHandler
  let tx: CoreApiRepos
  let mockVoteRepo: jest.Mocked<IVoteRepository>

  beforeEach(() => {
    mockVoteRepo = {
      findByItemAndUser: jest.fn(),
      upsert: jest.fn(),
      removeByItemAndUser: jest.fn(),
    } as unknown as jest.Mocked<IVoteRepository>

    handler = new RemoveVoteHandler()
    tx = { votes: mockVoteRepo } as unknown as CoreApiRepos
  })

  it('should remove the vote for the given item/user pair', async () => {
    await handler.execute(new RemoveVoteCommand('item-1', 'user-1'), tx)

    expect(mockVoteRepo.removeByItemAndUser).toHaveBeenCalledWith('item-1', 'user-1')
  })
})
