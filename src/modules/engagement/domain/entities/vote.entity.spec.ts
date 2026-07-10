import { Vote } from './vote.entity'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('Vote Entity', () => {
  it('create should stamp the org/item/user/value', () => {
    const vote = Vote.create({ orgId: 'org-1', itemId: 'item-1', userId: 'user-1', value: 1 })

    expect(vote.id).toBe('mock-uuid-v7')
    expect(vote.value).toBe(1)
  })

  it('changeValue should update the vote value in place (upvote <-> downvote toggle)', () => {
    const vote = Vote.create({ orgId: 'org-1', itemId: 'item-1', userId: 'user-1', value: 1 })

    vote.changeValue(-1)

    expect(vote.value).toBe(-1)
  })

  it('rehydrate should restore an existing vote as-is', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z')
    const vote = Vote.rehydrate({
      id: 'existing-id',
      orgId: 'org-1',
      itemId: 'item-1',
      userId: 'user-1',
      value: -1,
      createdAt,
    })

    expect(vote.value).toBe(-1)
    expect(vote.createdAt).toEqual(createdAt)
  })
})
