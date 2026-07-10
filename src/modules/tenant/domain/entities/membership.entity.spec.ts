import { Membership } from './membership.entity'
import { OrgRole } from '../org-rbac'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('Membership Entity', () => {
  it('createOwner should always assign OWNER role, regardless of caller intent', () => {
    const membership = Membership.createOwner({ orgId: 'org-1', userId: 'user-1' })

    expect(membership.id).toBe('mock-uuid-v7')
    expect(membership.orgId).toBe('org-1')
    expect(membership.userId).toBe('user-1')
    expect(membership.role).toBe(OrgRole.OWNER)
  })

  it('createMember should assign the given manageable role', () => {
    const membership = Membership.createMember({
      orgId: 'org-1',
      userId: 'user-2',
      role: OrgRole.MEMBER,
    })

    expect(membership.role).toBe(OrgRole.MEMBER)
  })

  it('rehydrate should restore an existing membership as-is', () => {
    const joinedAt = new Date('2026-01-01T00:00:00.000Z')
    const membership = Membership.rehydrate({
      id: 'existing-id',
      orgId: 'org-1',
      userId: 'user-1',
      role: OrgRole.ADMIN,
      joinedAt,
    })

    expect(membership.id).toBe('existing-id')
    expect(membership.role).toBe(OrgRole.ADMIN)
    expect(membership.joinedAt).toEqual(joinedAt)
  })

  it('changeRole should re-grade an existing member in place', () => {
    const membership = Membership.createMember({
      orgId: 'org-1',
      userId: 'user-2',
      role: OrgRole.GUEST,
    })

    membership.changeRole(OrgRole.ADMIN)

    expect(membership.role).toBe(OrgRole.ADMIN)
  })

  it('joinedAt getter should return a defensive copy (mutating it must not affect internal state)', () => {
    const joinedAt = new Date('2026-01-01T00:00:00.000Z')
    const membership = Membership.rehydrate({
      id: 'existing-id',
      orgId: 'org-1',
      userId: 'user-1',
      role: OrgRole.MEMBER,
      joinedAt,
    })

    const firstRead = membership.joinedAt
    firstRead.setFullYear(2099)

    expect(membership.joinedAt).toEqual(new Date('2026-01-01T00:00:00.000Z'))
  })
})
