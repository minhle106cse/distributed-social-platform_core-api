import { Bookmark } from './bookmark.entity'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('Bookmark Entity', () => {
  it('create should stamp the org/user/item that bookmarked it', () => {
    const bookmark = Bookmark.create({ orgId: 'org-1', userId: 'user-1', itemId: 'item-1' })

    expect(bookmark.id).toBe('mock-uuid-v7')
    expect(bookmark.orgId).toBe('org-1')
    expect(bookmark.userId).toBe('user-1')
    expect(bookmark.itemId).toBe('item-1')
  })

  it('rehydrate should restore an existing bookmark as-is', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z')
    const bookmark = Bookmark.rehydrate({
      id: 'existing-id',
      orgId: 'org-1',
      userId: 'user-1',
      itemId: 'item-1',
      createdAt,
    })

    expect(bookmark.id).toBe('existing-id')
    expect(bookmark.createdAt).toEqual(createdAt)
  })
})
