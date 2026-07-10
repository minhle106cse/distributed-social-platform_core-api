import { OrgInvite } from './org-invite.entity'
import { OrgRole } from '../org-rbac'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('OrgInvite Entity', () => {
  it('create should mint an unused invite', () => {
    const invite = OrgInvite.create({
      token: 'tok-1',
      orgId: 'org-1',
      role: OrgRole.MEMBER,
      createdBy: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
    })

    expect(invite.id).toBe('mock-uuid-v7')
    expect(invite.isUsed()).toBe(false)
    expect(invite.usedAt).toBeNull()
    expect(invite.usedBy).toBeNull()
  })

  it('isExpired should be true once past expiresAt', () => {
    const invite = OrgInvite.rehydrate({
      id: 'id-1',
      token: 'tok-1',
      orgId: 'org-1',
      role: OrgRole.MEMBER,
      createdBy: 'user-1',
      expiresAt: new Date(Date.now() - 1_000),
      usedAt: null,
      usedBy: null,
    })

    expect(invite.isExpired()).toBe(true)
  })

  it('isExpired should be false while still within the expiry window', () => {
    const invite = OrgInvite.rehydrate({
      id: 'id-1',
      token: 'tok-1',
      orgId: 'org-1',
      role: OrgRole.MEMBER,
      createdBy: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      usedBy: null,
    })

    expect(invite.isExpired()).toBe(false)
  })

  it('accept should bind the invite to the accepting user and mark it used', () => {
    const invite = OrgInvite.create({
      token: 'tok-1',
      orgId: 'org-1',
      role: OrgRole.MEMBER,
      createdBy: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
    })

    invite.accept('user-2')

    expect(invite.isUsed()).toBe(true)
    expect(invite.usedBy).toBe('user-2')
    expect(invite.usedAt).not.toBeNull()
  })
})
