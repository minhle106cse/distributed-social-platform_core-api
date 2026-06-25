import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { Membership } from '@/modules/tenant/domain/entities/membership.entity'
import { ORG_INVITE_REPOSITORY } from '@/modules/tenant/domain/repositories/org-invite.repository'
import type { IOrgInviteRepository } from '@/modules/tenant/domain/repositories/org-invite.repository'
import { MEMBERSHIP_REPOSITORY } from '@/modules/tenant/domain/repositories/membership.repository'
import type { IMembershipRepository } from '@/modules/tenant/domain/repositories/membership.repository'
import {
  InviteNotFoundError,
  InviteExpiredError,
  InviteAlreadyUsedError,
  AlreadyMemberError,
} from '@/common/errors/tenant.error'
import { AcceptInviteCommand } from './accept-invite.command'

@Injectable()
@CommandHandler(AcceptInviteCommand)
export class AcceptInviteHandler implements ICommandHandler<
  AcceptInviteCommand,
  { orgId: string; role: string }
> {
  constructor(
    @Inject(ORG_INVITE_REPOSITORY) private readonly inviteRepo: IOrgInviteRepository,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly membershipRepo: IMembershipRepository,
  ) {}

  async execute(command: AcceptInviteCommand) {
    const invite = await this.inviteRepo.findByToken(command.token)
    if (!invite) throw new InviteNotFoundError()
    if (invite.isExpired()) throw new InviteExpiredError()
    if (invite.isUsed()) throw new InviteAlreadyUsedError()

    const existing = await this.membershipRepo.findByOrgAndUser(invite.orgId, command.userId)
    if (existing) throw new AlreadyMemberError()

    const membership = Membership.createMember({
      id: command.membershipId,
      orgId: invite.orgId,
      userId: command.userId,
      role: invite.role,
    })

    await this.membershipRepo.save(membership)
    await this.inviteRepo.save(invite.accept(command.userId))

    return { orgId: invite.orgId, role: invite.role }
  }
}
