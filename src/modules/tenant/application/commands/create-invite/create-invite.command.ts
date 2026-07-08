import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'
import type { ManageableOrgRole } from '@/modules/tenant/domain/org-rbac'

export class CreateInviteCommand implements ICommand {
  readonly name = CreateInviteCommand.name
  readonly options: CommandOptions = { transactional: false, retryable: false }

  constructor(
    public readonly token: string,
    public readonly orgId: string,
    public readonly role: ManageableOrgRole,
    public readonly createdBy: string,
    public readonly expiresAt: Date,
  ) {}
}
