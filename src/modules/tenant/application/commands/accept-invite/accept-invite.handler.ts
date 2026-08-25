import { Inject, Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import { CACHE_STORE, CacheKeys } from '@distributed-social-platform/shared-kernel'
import type { ICacheStore } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { Membership } from '@/modules/tenant/domain/entities/membership.entity'
import {
  InviteNotFoundError,
  InviteExpiredError,
  InviteAlreadyUsedError,
  AlreadyMemberError,
} from '@/modules/tenant/domain/tenant.error'
import { AcceptInviteCommand } from './accept-invite.command'

@Injectable()
@CommandHandler(AcceptInviteCommand)
export class AcceptInviteHandler implements ITransactionalCommandHandler<
  AcceptInviteCommand,
  { orgId: string; role: string },
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  constructor(@Inject(CACHE_STORE) private readonly cache: ICacheStore) {}

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

  /**
   * The caller was NOT a member a moment ago, and `{isMember:false}` is a
   * cacheable answer (a completed lookup, not a failure), so search-service /
   * notification-service may be holding a negative entry that would lock the
   * new member out of the org they just joined for up to a TTL. Drop it.
   */
  async afterCommit(
    command: AcceptInviteCommand,
    result: { orgId: string; role: string },
  ): Promise<void> {
    await this.cache.del(CacheKeys.membership(result.orgId, command.userId))
  }
}
