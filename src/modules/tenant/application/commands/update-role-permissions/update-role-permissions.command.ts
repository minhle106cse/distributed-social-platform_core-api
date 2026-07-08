import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'
import type { OrgRole } from '@/modules/tenant/domain/org-rbac'

export class UpdateRolePermissionsCommand implements ICommand {
  readonly name = UpdateRolePermissionsCommand.name
  readonly options: CommandOptions = { transactional: true, retryable: true }

  constructor(
    public readonly orgId: string,
    public readonly role: OrgRole,
    public readonly permissions: string[],
  ) {}
}
