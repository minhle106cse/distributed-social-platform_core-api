import { Revision } from './revision.entity'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('Revision Entity', () => {
  it('create should snapshot the given body/version/editor', () => {
    const revision = Revision.create({
      itemId: 'item-1',
      version: 2,
      bodySnapshot: 'body at v2',
      editedByUserId: 'user-1',
    })

    expect(revision.id).toBe('mock-uuid-v7')
    expect(revision.itemId).toBe('item-1')
    expect(revision.version).toBe(2)
    expect(revision.bodySnapshot).toBe('body at v2')
    expect(revision.editedByUserId).toBe('user-1')
  })

  it('rehydrate should restore an existing revision as-is', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z')
    const revision = Revision.rehydrate({
      id: 'existing-id',
      itemId: 'item-1',
      version: 5,
      bodySnapshot: 'body at v5',
      editedByUserId: 'user-2',
      createdAt,
    })

    expect(revision.version).toBe(5)
    expect(revision.createdAt).toEqual(createdAt)
  })
})
