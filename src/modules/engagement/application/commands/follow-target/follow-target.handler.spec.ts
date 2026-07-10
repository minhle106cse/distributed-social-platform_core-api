import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import type { ISpaceRepository } from '@/modules/tenant/domain/repositories/space.repository'
import type { IFollowRepository } from '@/modules/engagement/domain/repositories/follow.repository'
import type { IOutboxRepository } from '@/modules/outbox/domain/repositories/outbox.repository'
import { Follow } from '@/modules/engagement/domain/entities/follow.entity'
import { runWithTenantContext, setTenantId } from '@/common/tenant/tenant.context'
import { FollowTargetNotFoundError } from '@/common/errors/engagement.error'
import { FollowTargetHandler } from './follow-target.handler'
import { FollowTargetCommand } from './follow-target.command'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('FollowTargetHandler', () => {
  let handler: FollowTargetHandler
  let mockItemRepo: jest.Mocked<IKnowledgeItemRepository>
  let mockSpaceRepo: jest.Mocked<ISpaceRepository>
  let mockFollowRepo: jest.Mocked<IFollowRepository>
  let mockOutboxRepo: jest.Mocked<IOutboxRepository>

  beforeEach(() => {
    mockItemRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      updateWithOcc: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IKnowledgeItemRepository>

    mockSpaceRepo = {
      findById: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<ISpaceRepository>

    mockFollowRepo = {
      add: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<IFollowRepository>

    mockOutboxRepo = {
      append: jest.fn(),
    } as unknown as jest.Mocked<IOutboxRepository>

    handler = new FollowTargetHandler(mockItemRepo, mockSpaceRepo, mockFollowRepo, mockOutboxRepo)
  })

  function runInTenant<T>(orgId: string, fn: () => Promise<T>): Promise<T> {
    return runWithTenantContext(() => {
      setTenantId(orgId)
      return fn()
    })
  }

  it('should throw FollowTargetNotFoundError when following a DOCUMENT that does not exist', async () => {
    mockItemRepo.findById.mockResolvedValueOnce(null)

    await expect(
      runInTenant('org-1', () =>
        handler.execute(new FollowTargetCommand('user-1', 'DOCUMENT', 'item-1')),
      ),
    ).rejects.toThrow(FollowTargetNotFoundError)
    expect(mockFollowRepo.add).not.toHaveBeenCalled()
  })

  it('should throw FollowTargetNotFoundError when following a SPACE that does not exist', async () => {
    mockSpaceRepo.findById.mockResolvedValueOnce(null)

    await expect(
      runInTenant('org-1', () =>
        handler.execute(new FollowTargetCommand('user-1', 'SPACE', 'space-1')),
      ),
    ).rejects.toThrow(FollowTargetNotFoundError)
  })

  it('should throw when tenant context is missing (fail-closed, not silently org-less)', async () => {
    await expect(
      handler.execute(new FollowTargetCommand('user-1', 'SPACE', 'space-1')),
    ).rejects.toThrow('Tenant context is not set')
  })

  it('should create the follow and append a FOLLOW_CREATED event keyed by relationship identity (not row id)', async () => {
    mockSpaceRepo.findById.mockResolvedValueOnce({ id: 'space-1' } as never)

    await runInTenant('org-1', () =>
      handler.execute(new FollowTargetCommand('user-1', 'SPACE', 'space-1')),
    )

    expect(mockFollowRepo.add).toHaveBeenCalledTimes(1)

    const appended = mockOutboxRepo.append.mock.calls[0][0]
    expect(appended).toMatchObject({
      aggregateId: Follow.streamKey('user-1', 'SPACE', 'space-1'),
      orgId: 'org-1',
      payload: { userId: 'user-1', targetType: 'SPACE', targetId: 'space-1' },
    })
  })
})
