import { ICommand } from '@distributed-social-platform/shared-kernel'
import type { OrgRole } from '@/modules/tenant/domain/org-rbac'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// set-semantics: overwrites the whole permission set — auto-retried on deadlock (transactional:true)
// lands on the same state, no external side effect, so blind retry is safe here.
export class UpdateRolePermissionsCommand implements ICommand {
  readonly name = UpdateRolePermissionsCommand.name

  constructor(
    public readonly orgId: string,
    public readonly role: OrgRole,
    public readonly permissions: string[],
    public readonly actorUserId: string,
  ) {}
}
