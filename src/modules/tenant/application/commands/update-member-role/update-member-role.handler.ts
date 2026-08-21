import { Injectable } from '@nestjs/common'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import { logAudit } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { MembershipNotFoundError } from '@/common/errors/tenant.error'
import { UpdateMemberRoleCommand } from './update-member-role.command'

@Injectable()
@CommandHandler(UpdateMemberRoleCommand)
export class UpdateMemberRoleHandler implements ITransactionalCommandHandler<
  UpdateMemberRoleCommand,
  void,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  constructor(
    @InjectPinoLogger(UpdateMemberRoleHandler.name) private readonly logger: PinoLogger,
  ) {}

  async execute(command: UpdateMemberRoleCommand, tx: CoreApiRepos): Promise<void> {
    const membership = await tx.memberships.findByOrgAndUser(command.orgId, command.targetUserId)
    if (!membership) throw new MembershipNotFoundError()

    const previousRole = membership.role
    membership.changeRole(command.newRole)
    await tx.memberships.save(membership)

    // Privilege-escalation vector — actor + target + before/after role, always
    // worth the audit trail (see logging_standard.md "Audit Log" 3-part test).
    logAudit(this.logger, {
      action: 'org.member_role_updated',
      outcome: 'success',
      actorUserId: command.actorUserId,
      targetUserId: command.targetUserId,
      metadata: { orgId: command.orgId, previousRole, newRole: command.newRole },
    })
  }
}
