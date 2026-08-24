import type { CoreApiRepos } from '@/common/database/core-api-repos'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import type { ISpaceRepository } from '@/modules/tenant/domain/repositories/space.repository'
import type { IFollowRepository } from '@/modules/engagement/domain/repositories/follow.repository'
import type { IOutboxWriter } from '@distributed-social-platform/shared-kernel'
import { Follow } from '@/modules/engagement/domain/entities/follow.entity'
import { runWithTenantContext, setTenantId } from '@/common/tenant/tenant.context'
import { FollowTargetNotFoundError } from '@/modules/engagement/domain/engagement.error'
import { FollowTargetHandler } from './follow-target.handler'
import { FollowTargetCommand } from './follow-target.command'

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

describe('FollowTargetHandler', () => {
  let handler: FollowTargetHandler
  let tx: CoreApiRepos
  let mockItemRepo: jest.Mocked<IKnowledgeItemRepository>
  let mockSpaceRepo: jest.Mocked<ISpaceRepository>
  let mockFollowRepo: jest.Mocked<IFollowRepository>
  let mockOutboxRepo: jest.Mocked<IOutboxWriter>

  beforeEach(() => {
    mockItemRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      updateWithOcc: jest.fn(),
      update: jest.fn(),
    }

    mockSpaceRepo = {
      findById: jest.fn(),
      save: jest.fn(),
    }

    mockFollowRepo = {
      add: jest.fn(),
      remove: jest.fn(),
    }

    mockOutboxRepo = {
      append: jest.fn(),
    }

    handler = new FollowTargetHandler()
    tx = {
      items: mockItemRepo,
      spaces: mockSpaceRepo,
      follows: mockFollowRepo,
      outbox: mockOutboxRepo,
    } as unknown as CoreApiRepos
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
        handler.execute(new FollowTargetCommand('user-1', 'DOCUMENT', 'item-1'), tx),
      ),
    ).rejects.toThrow(FollowTargetNotFoundError)
    expect(mockFollowRepo.add).not.toHaveBeenCalled()
  })

  it('should throw FollowTargetNotFoundError when following a SPACE that does not exist', async () => {
    mockSpaceRepo.findById.mockResolvedValueOnce(null)

    await expect(
      runInTenant('org-1', () =>
        handler.execute(new FollowTargetCommand('user-1', 'SPACE', 'space-1'), tx),
      ),
    ).rejects.toThrow(FollowTargetNotFoundError)
  })

  it('should throw when tenant context is missing (fail-closed, not silently org-less)', async () => {
    await expect(
      handler.execute(new FollowTargetCommand('user-1', 'SPACE', 'space-1'), tx),
    ).rejects.toThrow('Tenant context is not set')
  })

  it('should create the follow and append a FOLLOW_CREATED event keyed by relationship identity (not row id)', async () => {
    mockSpaceRepo.findById.mockResolvedValueOnce({ id: 'space-1' } as never)

    await runInTenant('org-1', () =>
      handler.execute(new FollowTargetCommand('user-1', 'SPACE', 'space-1'), tx),
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
