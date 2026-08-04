import { ICommand } from '@distributed-social-platform/shared-kernel'
import type { ManageableOrgRole } from '@/modules/tenant/domain/org-rbac'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// none: a duplicate invite is harmless — pull-based (no email sent), the token is just a link;
// a second row is an unused extra link, not a side effect worth deduping.
export class CreateInviteCommand implements ICommand {
  readonly name = CreateInviteCommand.name

  constructor(
    public readonly token: string,
    public readonly orgId: string,
    public readonly role: ManageableOrgRole,
    public readonly createdBy: string,
    public readonly expiresAt: Date,
  ) {}
}
