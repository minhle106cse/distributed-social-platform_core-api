import { Space } from './space.entity'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('Space Entity', () => {
  it('create should default visibility to ORG when not provided', () => {
    const space = Space.create({ orgId: 'org-1', name: 'Engineering' })

    expect(space.id).toBe('mock-uuid-v7')
    expect(space.visibility).toBe('ORG')
    expect(space.isDeleted).toBe(false)
  })

  it('create should honor an explicit PRIVATE visibility', () => {
    const space = Space.create({ orgId: 'org-1', name: 'Leadership', visibility: 'PRIVATE' })

    expect(space.visibility).toBe('PRIVATE')
  })

  it('rehydrate should restore a soft-deleted space correctly', () => {
    const deletedAt = new Date('2026-05-01T00:00:00.000Z')
    const space = Space.rehydrate({
      id: 'existing-id',
      orgId: 'org-1',
      name: 'Engineering',
      visibility: 'ORG',
      deletedAt,
    })

    expect(space.isDeleted).toBe(true)
    expect(space.deletedAt).toEqual(deletedAt)
  })
})
