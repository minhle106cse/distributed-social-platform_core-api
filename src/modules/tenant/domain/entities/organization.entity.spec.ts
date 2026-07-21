import { Organization } from './organization.entity'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('Organization Entity', () => {
  it('create should apply default seatLimit when not provided', () => {
    const org = Organization.create({ name: 'Acme', slug: 'acme' })

    expect(org.id).toBe('mock-uuid-v7')
    expect(org.seatLimit).toBe(10)
    expect(org.isDeleted).toBe(false)
    expect(org.deletedAt).toBeNull()
  })

  it('create should honor an explicit seatLimit override', () => {
    const org = Organization.create({
      name: 'Acme',
      slug: 'acme',
      seatLimit: 50,
    })

    expect(org.seatLimit).toBe(50)
  })

  it('rehydrate should restore a soft-deleted organization correctly', () => {
    const deletedAt = new Date('2026-05-01T00:00:00.000Z')
    const org = Organization.rehydrate({
      id: 'existing-id',
      name: 'Acme',
      slug: 'acme',
      seatLimit: 10,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt,
    })

    expect(org.isDeleted).toBe(true)
    expect(org.deletedAt).toEqual(deletedAt)
  })

  it('deletedAt/createdAt getters should return defensive copies', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z')
    const org = Organization.rehydrate({
      id: 'existing-id',
      name: 'Acme',
      slug: 'acme',
      seatLimit: 10,
      createdAt,
      deletedAt: null,
    })

    const firstRead = org.createdAt
    firstRead.setFullYear(2099)

    expect(org.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'))
  })
})
