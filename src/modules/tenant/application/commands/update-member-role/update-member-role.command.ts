import { ICommand } from '@distributed-social-platform/shared-kernel'
import type { ManageableOrgRole } from '@/modules/tenant/domain/org-rbac'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// set-semantics: overwrites the membership role; re-applying lands on the same state.
export class UpdateMemberRoleCommand implements ICommand {
  readonly name = UpdateMemberRoleCommand.name

  constructor(
    public readonly orgId: string,
    public readonly targetUserId: string,
    public readonly newRole: ManageableOrgRole,
    public readonly actorUserId: string,
  ) {}
}
