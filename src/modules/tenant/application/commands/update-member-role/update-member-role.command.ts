import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'
import { OrgRole } from '@/modules/tenant/domain/entities/membership.entity'

export class UpdateMemberRoleCommand implements ICommand {
  readonly name = 'UpdateMemberRoleCommand'
  readonly options: CommandOptions = { transactional: false, retryable: false }

  constructor(
    public readonly orgId: string,
    public readonly targetUserId: string,
    public readonly newRole: OrgRole,
  ) {}
}
