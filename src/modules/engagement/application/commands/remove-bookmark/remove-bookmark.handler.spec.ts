import type { IBookmarkRepository } from '@/modules/engagement/domain/repositories/bookmark.repository'
import { RemoveBookmarkHandler } from './remove-bookmark.handler'
import { RemoveBookmarkCommand } from './remove-bookmark.command'

describe('RemoveBookmarkHandler', () => {
  let handler: RemoveBookmarkHandler
  let mockBookmarkRepo: jest.Mocked<IBookmarkRepository>

  beforeEach(() => {
    mockBookmarkRepo = {
      add: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<IBookmarkRepository>

    handler = new RemoveBookmarkHandler(mockBookmarkRepo)
  })

  it('should remove the bookmark for the given item/user pair', async () => {
    await handler.execute(new RemoveBookmarkCommand('item-1', 'user-1'))

    expect(mockBookmarkRepo.remove).toHaveBeenCalledWith('item-1', 'user-1')
  })
})
