import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'
import type { ManageableOrgRole } from '@/modules/tenant/domain/org-rbac'

export class UpdateMemberRoleCommand implements ICommand {
  readonly name = UpdateMemberRoleCommand.name
  readonly options: CommandOptions = {
    transactional: false,
    // set-semantics: overwrites the membership role; re-applying lands on the same state.
  }

  constructor(
    public readonly orgId: string,
    public readonly targetUserId: string,
    public readonly newRole: ManageableOrgRole,
    public readonly actorUserId: string,
  ) {}
}
