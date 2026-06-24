import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
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
  ) {}

  async execute(command: UpdateMemberRoleCommand): Promise<void> {
    const membership = await this.membershipRepo.findByOrgAndUser(
      command.orgId,
      command.targetUserId,
    )
    if (!membership) throw new MembershipNotFoundError()

    const updated = membership.changeRole(command.newRole)
    await this.membershipRepo.save(updated)
  }
}
