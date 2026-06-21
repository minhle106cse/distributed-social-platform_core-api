import { ICommand } from '@distributed-social-platform/shared-kernel'
import type { OrgRole } from '@/modules/tenant/domain/entities/membership.entity'

export class CreateInviteCommand implements ICommand {
  readonly name = 'CreateInviteCommand'

  constructor(
    public readonly inviteId: string,
    public readonly token: string,
    public readonly orgId: string,
    public readonly role: OrgRole,
    public readonly createdBy: string,
    public readonly expiresAt: Date,
    public readonly options = { transactional: false, retryable: false },
  ) {}
}
