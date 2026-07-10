import { Follow } from './follow.entity'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('Follow Entity', () => {
  it('create should stamp the follower/target relationship', () => {
    const follow = Follow.create({
      orgId: 'org-1',
      userId: 'user-1',
      targetType: 'SPACE',
      targetId: 'space-1',
    })

    expect(follow.id).toBe('mock-uuid-v7')
    expect(follow.targetType).toBe('SPACE')
    expect(follow.targetId).toBe('space-1')
  })

  it('rehydrate should restore an existing follow as-is', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z')
    const follow = Follow.rehydrate({
      id: 'existing-id',
      orgId: 'org-1',
      userId: 'user-1',
      targetType: 'DOCUMENT',
      targetId: 'item-1',
      createdAt,
    })

    expect(follow.targetType).toBe('DOCUMENT')
    expect(follow.createdAt).toEqual(createdAt)
  })

  it('streamKey should be identical for the same relationship regardless of row identity — this is the anti-ghost-follower invariant', () => {
    // FollowCreated and FollowRemoved never share a row id (create has one,
    // remove has none) — they MUST key by relationship identity instead so
    // Kafka partitions them together and preserves ordering.
    const created = Follow.create({
      orgId: 'org-1',
      userId: 'user-1',
      targetType: 'SPACE',
      targetId: 'space-1',
    })

    const createKey = Follow.streamKey(created.userId, created.targetType, created.targetId)
    const removeKey = Follow.streamKey('user-1', 'SPACE', 'space-1')

    expect(createKey).toBe(removeKey)
    expect(createKey).toBe('user-1:SPACE:space-1')
  })

  it('streamKey should differ across users/targets (no accidental collisions)', () => {
    const keyA = Follow.streamKey('user-1', 'SPACE', 'space-1')
    const keyB = Follow.streamKey('user-2', 'SPACE', 'space-1')
    const keyC = Follow.streamKey('user-1', 'DOCUMENT', 'space-1')

    expect(keyA).not.toBe(keyB)
    expect(keyA).not.toBe(keyC)
  })
})
