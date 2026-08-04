import type { CoreApiRepos } from '@/infrastructure/database/prisma/core-api-repos.factory'
import type { IOrgInviteRepository } from '@/modules/tenant/domain/repositories/org-invite.repository'
import { OrgRole } from '@/modules/tenant/domain/org-rbac'
import { CreateInviteHandler } from './create-invite.handler'
import { CreateInviteCommand } from './create-invite.command'

describe('CreateInviteHandler', () => {
  let handler: CreateInviteHandler
  let tx: CoreApiRepos
  let mockInviteRepo: jest.Mocked<IOrgInviteRepository>

  beforeEach(() => {
    mockInviteRepo = {
      save: jest.fn(),
      findByToken: jest.fn(),
    } as unknown as jest.Mocked<IOrgInviteRepository>

    handler = new CreateInviteHandler()
    tx = { invites: mockInviteRepo } as unknown as CoreApiRepos
  })

  it('should mint an invite for a manageable role and return its token', async () => {
    const expiresAt = new Date(Date.now() + 60_000)
    const command = new CreateInviteCommand('tok-1', 'org-1', OrgRole.MEMBER, 'user-1', expiresAt)

    const token = await handler.execute(command, tx)

    expect(token).toBe('tok-1')
    expect(mockInviteRepo.save).toHaveBeenCalledTimes(1)
    const savedInvite = mockInviteRepo.save.mock.calls[0][0]
    expect(savedInvite.orgId).toBe('org-1')
    expect(savedInvite.role).toBe(OrgRole.MEMBER)
    expect(savedInvite.createdBy).toBe('user-1')
    expect(savedInvite.isUsed()).toBe(false)
  })
})
