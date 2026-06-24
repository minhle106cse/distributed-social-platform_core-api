import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'
import type { OrgRole } from '@/modules/tenant/domain/entities/membership.entity'

export class UpdateRolePermissionsCommand implements ICommand {
  readonly name = 'UpdateRolePermissionsCommand'
  readonly options: CommandOptions = { transactional: true, retryable: true }

  constructor(
    public readonly orgId: string,
    public readonly role: OrgRole,
    public readonly permissions: string[],
  ) {}
}
