import { Inject, Injectable } from '@nestjs/common'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import { CACHE_STORE, CacheKeys, logAudit } from '@distributed-social-platform/shared-kernel'
import type { ICacheStore } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { MembershipNotFoundError } from '@/modules/tenant/domain/tenant.error'
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
    @Inject(CACHE_STORE) private readonly cache: ICacheStore,
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

  /**
   * This user's cached role is now wrong everywhere it is read. Only the
   * membership entry needs dropping — the permission sets keyed by role are
   * unaffected, since no role's permission LIST changed here, only which role
   * this one user holds.
   *
   * afterCommit for the same reason as UpdateRolePermissionsHandler: deleting
   * before the commit lands lets a concurrent reader re-cache the old role.
   */
  async afterCommit(command: UpdateMemberRoleCommand): Promise<void> {
    await this.cache.del(CacheKeys.membership(command.orgId, command.targetUserId))
  }
}
