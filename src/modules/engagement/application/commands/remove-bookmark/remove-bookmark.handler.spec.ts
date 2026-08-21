import type { CoreApiRepos } from '@/common/database/core-api-repos'
import type { IBookmarkRepository } from '@/modules/engagement/domain/repositories/bookmark.repository'
import { RemoveBookmarkHandler } from './remove-bookmark.handler'
import { RemoveBookmarkCommand } from './remove-bookmark.command'

describe('RemoveBookmarkHandler', () => {
  let handler: RemoveBookmarkHandler
  let tx: CoreApiRepos
  let mockBookmarkRepo: jest.Mocked<IBookmarkRepository>

  beforeEach(() => {
    mockBookmarkRepo = {
      add: jest.fn(),
      remove: jest.fn(),
    }

    handler = new RemoveBookmarkHandler()
    tx = { bookmarks: mockBookmarkRepo } as unknown as CoreApiRepos
  })

  it('should remove the bookmark for the given item/user pair', async () => {
    await handler.execute(new RemoveBookmarkCommand('item-1', 'user-1'), tx)

    expect(mockBookmarkRepo.remove).toHaveBeenCalledWith('item-1', 'user-1')
  })
})
