import { KnowledgeItem } from './knowledge-item.entity'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('KnowledgeItem Entity', () => {
  it('create should always start as DRAFT, unverified, version 1', () => {
    const item = KnowledgeItem.create({
      orgId: 'org-1',
      spaceId: 'space-1',
      type: 'DOCUMENT',
      title: 'Onboarding Guide',
      body: 'Step 1...',
      createdByUserId: 'user-1',
    })

    expect(item.id).toBe('mock-uuid-v7')
    expect(item.status).toBe('DRAFT')
    expect(item.isVerified).toBe(false)
    expect(item.version).toBe(1)
    expect(item.parentId).toBeNull()
    expect(item.isDeleted).toBe(false)
  })

  it('applyEdit should bump version and stamp the editor (OCC bookkeeping)', () => {
    const item = KnowledgeItem.create({
      orgId: 'org-1',
      spaceId: 'space-1',
      type: 'DOCUMENT',
      title: 'Onboarding Guide',
      body: 'Step 1...',
      createdByUserId: 'user-1',
    })

    item.applyEdit({ title: 'Onboarding Guide v2', body: 'Step 1 revised...', editedByUserId: 'user-2' })

    expect(item.version).toBe(2)
    expect(item.title).toBe('Onboarding Guide v2')
    expect(item.updatedByUserId).toBe('user-2')
  })

  it('publish should transition status to PUBLISHED', () => {
    const item = KnowledgeItem.create({
      orgId: 'org-1',
      spaceId: 'space-1',
      type: 'DOCUMENT',
      title: 'Onboarding Guide',
      body: 'Step 1...',
      createdByUserId: 'user-1',
    })

    item.publish()

    expect(item.status).toBe('PUBLISHED')
  })

  it('verify should mark isVerified and stamp the verifier', () => {
    const item = KnowledgeItem.create({
      orgId: 'org-1',
      spaceId: 'space-1',
      type: 'DOCUMENT',
      title: 'Onboarding Guide',
      body: 'Step 1...',
      createdByUserId: 'user-1',
    })

    item.verify('verifier-1')

    expect(item.isVerified).toBe(true)
    expect(item.updatedByUserId).toBe('verifier-1')
  })

  it('softDelete should set deletedAt / isDeleted without erasing the row', () => {
    const item = KnowledgeItem.create({
      orgId: 'org-1',
      spaceId: 'space-1',
      type: 'DOCUMENT',
      title: 'Onboarding Guide',
      body: 'Step 1...',
      createdByUserId: 'user-1',
    })

    item.softDelete()

    expect(item.isDeleted).toBe(true)
    expect(item.deletedAt).not.toBeNull()
  })

  it('acceptAnswer/clearAcceptedAnswer should toggle acceptedAnswerId', () => {
    const item = KnowledgeItem.create({
      orgId: 'org-1',
      spaceId: 'space-1',
      type: 'QUESTION',
      title: 'How to deploy?',
      body: '...',
      createdByUserId: 'user-1',
    })

    item.acceptAnswer('answer-1')
    expect(item.acceptedAnswerId).toBe('answer-1')

    item.clearAcceptedAnswer()
    expect(item.acceptedAnswerId).toBeNull()
  })

  it('rehydrate should restore an existing item as-is', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    const item = KnowledgeItem.rehydrate({
      id: 'existing-id',
      orgId: 'org-1',
      spaceId: 'space-1',
      type: 'ADR',
      title: 'ADR 1',
      body: 'body',
      parentId: null,
      acceptedAnswerId: null,
      status: 'PUBLISHED',
      isVerified: true,
      version: 3,
      createdByUserId: 'user-1',
      updatedByUserId: 'user-2',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })

    expect(item.version).toBe(3)
    expect(item.status).toBe('PUBLISHED')
    expect(item.isVerified).toBe(true)
  })
})
