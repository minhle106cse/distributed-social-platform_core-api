import type { CoreApiRepos } from '@/common/database/core-api-repos'
import type { IFollowRepository } from '@/modules/engagement/domain/repositories/follow.repository'
import type { IOutboxWriter } from '@distributed-social-platform/shared-kernel'
import { Follow } from '@/modules/engagement/domain/entities/follow.entity'
import { runWithTenantContext, setTenantId } from '@/common/tenant/tenant.context'
import { UnfollowTargetHandler } from './unfollow-target.handler'
import { UnfollowTargetCommand } from './unfollow-target.command'

describe('UnfollowTargetHandler', () => {
  let handler: UnfollowTargetHandler
  let tx: CoreApiRepos
  let mockFollowRepo: jest.Mocked<IFollowRepository>
  let mockOutboxRepo: jest.Mocked<IOutboxWriter>

  beforeEach(() => {
    mockFollowRepo = {
      add: jest.fn(),
      remove: jest.fn(),
    }

    mockOutboxRepo = {
      append: jest.fn(),
    }

    handler = new UnfollowTargetHandler()
    tx = { follows: mockFollowRepo, outbox: mockOutboxRepo } as unknown as CoreApiRepos
  })

  it('should remove the follow and append a FOLLOW_REMOVED event with the SAME partition key FollowCreated would use (ordering guarantee)', async () => {
    await runWithTenantContext(() => {
      setTenantId('org-1')
      return handler.execute(new UnfollowTargetCommand('user-1', 'SPACE', 'space-1'), tx)
    })

    expect(mockFollowRepo.remove).toHaveBeenCalledWith('user-1', 'SPACE', 'space-1')

    const appended = mockOutboxRepo.append.mock.calls[0][0]
    expect(appended).toMatchObject({
      aggregateId: Follow.streamKey('user-1', 'SPACE', 'space-1'),
      orgId: 'org-1',
    })
  })

  it('should throw when tenant context is missing', async () => {
    await expect(
      handler.execute(new UnfollowTargetCommand('user-1', 'SPACE', 'space-1'), tx),
    ).rejects.toThrow('Tenant context is not set')
  })
})
