import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { Membership } from '@/modules/tenant/domain/entities/membership.entity'
import {
  InviteNotFoundError,
  InviteExpiredError,
  InviteAlreadyUsedError,
  AlreadyMemberError,
} from '@/common/errors/tenant.error'
import { AcceptInviteCommand } from './accept-invite.command'

@Injectable()
@CommandHandler(AcceptInviteCommand)
export class AcceptInviteHandler implements ITransactionalCommandHandler<
  AcceptInviteCommand,
  { orgId: string; role: string },
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: AcceptInviteCommand, tx: CoreApiRepos) {
    const invite = await tx.invites.findByToken(command.token)
    if (!invite) throw new InviteNotFoundError()
    if (invite.isExpired()) throw new InviteExpiredError()
    if (invite.isUsed()) throw new InviteAlreadyUsedError()

    const existing = await tx.memberships.findByOrgAndUser(invite.orgId, command.userId)
    if (existing) throw new AlreadyMemberError()

    const membership = Membership.createMember({
      orgId: invite.orgId,
      userId: command.userId,
      role: invite.role,
    })

    await tx.memberships.save(membership)
    invite.accept(command.userId)
    await tx.invites.save(invite)

    return { orgId: invite.orgId, role: invite.role }
  }
}
