import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'
import type { ManageableOrgRole } from '@/modules/tenant/domain/org-rbac'

export class UpdateMemberRoleCommand implements ICommand {
  readonly name = UpdateMemberRoleCommand.name
  readonly options: CommandOptions = { transactional: false, retryable: false }

  constructor(
    public readonly orgId: string,
    public readonly targetUserId: string,
    public readonly newRole: ManageableOrgRole,
  ) {}
}
