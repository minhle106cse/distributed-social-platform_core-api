import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'
import type { ManageableOrgRole } from '@/modules/tenant/domain/org-rbac'

export class CreateInviteCommand implements ICommand {
  readonly name = CreateInviteCommand.name
  readonly options: CommandOptions = {
    transactional: false,
    // none: a duplicate invite is harmless — pull-based (no email sent), the token is just a link;
    // a second row is an unused extra link, not a side effect worth deduping.
  }

  constructor(
    public readonly token: string,
    public readonly orgId: string,
    public readonly role: ManageableOrgRole,
    public readonly createdBy: string,
    public readonly expiresAt: Date,
  ) {}
}
