import { ICommand } from '@distributed-social-platform/shared-kernel'
import type { OrgRole } from '@/common/tenant/org-permissions'

export class UpdateRolePermissionsCommand implements ICommand {
  readonly name = 'UpdateRolePermissionsCommand'

  constructor(
    public readonly orgId: string,
    public readonly role: OrgRole,
    public readonly permissions: string[],
    public readonly options = { transactional: true, retryable: false },
  ) {}
}
