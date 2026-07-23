import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'
import type { OrgRole } from '@/modules/tenant/domain/org-rbac'

export class UpdateRolePermissionsCommand implements ICommand {
  readonly name = UpdateRolePermissionsCommand.name
  readonly options: CommandOptions = {
    transactional: true,
    // set-semantics: overwrites the whole permission set — auto-retried on deadlock (transactional:true)
    // lands on the same state, no external side effect, so blind retry is safe here.
  }

  constructor(
    public readonly orgId: string,
    public readonly role: OrgRole,
    public readonly permissions: string[],
    public readonly actorUserId: string,
  ) {}
}
