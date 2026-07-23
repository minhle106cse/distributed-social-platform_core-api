import { Injectable, Inject } from '@nestjs/common'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { logAudit } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { MEMBERSHIP_REPOSITORY } from '@/modules/tenant/domain/repositories/membership.repository'
import type { IMembershipRepository } from '@/modules/tenant/domain/repositories/membership.repository'
import { MembershipNotFoundError } from '@/common/errors/tenant.error'
import { UpdateMemberRoleCommand } from './update-member-role.command'

@Injectable()
@CommandHandler(UpdateMemberRoleCommand)
export class UpdateMemberRoleHandler implements ICommandHandler<UpdateMemberRoleCommand> {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY) private readonly membershipRepo: IMembershipRepository,
    @InjectPinoLogger(UpdateMemberRoleHandler.name) private readonly logger: PinoLogger,
  ) {}

  async execute(command: UpdateMemberRoleCommand): Promise<void> {
    const membership = await this.membershipRepo.findByOrgAndUser(
      command.orgId,
      command.targetUserId,
    )
    if (!membership) throw new MembershipNotFoundError()

    const previousRole = membership.role
    membership.changeRole(command.newRole)
    await this.membershipRepo.save(membership)

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
