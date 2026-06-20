import { ICommand } from '@distributed-social-platform/shared-kernel'
import { OrgRole } from '@/modules/tenant/domain/entities/membership.entity'

export class UpdateMemberRoleCommand implements ICommand {
  readonly name = 'UpdateMemberRoleCommand'

  constructor(
    public readonly orgId: string,
    public readonly targetUserId: string,
    public readonly newRole: OrgRole,
    public readonly options = { transactional: true, retryable: false },
  ) {}
}
