import { Inject, Injectable } from '@nestjs/common'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { OrgRole } from '@/modules/tenant/domain/org-rbac'
import {
  CACHE_STORE,
  CacheKeys,
  isValidOrgPermission,
  logAudit,
} from '@distributed-social-platform/shared-kernel'
import type { ICacheStore } from '@distributed-social-platform/shared-kernel'
import {
  CannotModifyOwnerPermissionsError,
  InvalidOrgPermissionError,
} from '@/modules/tenant/domain/tenant.error'
import { UpdateRolePermissionsCommand } from './update-role-permissions.command'

@Injectable()
@CommandHandler(UpdateRolePermissionsCommand)
export class UpdateRolePermissionsHandler implements ITransactionalCommandHandler<
  UpdateRolePermissionsCommand,
  void,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  constructor(
    @InjectPinoLogger(UpdateRolePermissionsHandler.name) private readonly logger: PinoLogger,
    @Inject(CACHE_STORE) private readonly cache: ICacheStore,
  ) {}

  async execute(command: UpdateRolePermissionsCommand, tx: CoreApiRepos): Promise<void> {
    // Guardrail: OWNER luôn full quyền (implicit) → không cho chỉnh, chống lock-out.
    if (command.role === OrgRole.OWNER) throw new CannotModifyOwnerPermissionsError()

    // Chỉ chấp nhận permission có trong catalog (tránh dữ liệu rác / quyền rỗng nghĩa).
    const unique = [...new Set(command.permissions)]
    for (const p of unique) {
      if (!isValidOrgPermission(p)) throw new InvalidOrgPermissionError(p)
    }

    await tx.rolePermissions.replaceForRole(command.orgId, command.role, unique)

    // Privilege-escalation vector — a role's permission SET changing affects
    // every member holding that role, not just one target user.
    logAudit(this.logger, {
      action: 'org.role_permissions_updated',
      outcome: 'success',
      actorUserId: command.actorUserId,
      metadata: { orgId: command.orgId, role: command.role, permissions: unique },
    })
  }

  /**
   * Drop the cached permission set for this role so search-service and
   * notification-service stop serving the OLD one. They cache
   * `org-permissions:{orgId}:{role}` for 30s; without this, an OWNER's edit
   * would not take effect there for up to that long — which defeats the point
   * of Org RBAC being editable at runtime.
   *
   * ⚠️ MUST be afterCommit, not inside `execute`. Deleting before the commit
   * lands opens the classic cache-aside race: a concurrent reader misses,
   * reads the still-uncommitted OLD row, and re-populates the cache — then the
   * commit lands and the stale value sits there for a full TTL. Deleting after
   * the commit leaves only a microsecond-wide version of that race, against
   * the 30s it removes.
   *
   * One DELETE, not one per member: that is exactly why the entry is keyed by
   * (orgId, role) rather than per user (see CacheKeys.orgPermissions).
   *
   * CommandBus swallows anything thrown here — correct, since the database work
   * has already committed — so a failed invalidation degrades to the 30s TTL it
   * was shortening, and the adapter logs it at warn.
   */
  async afterCommit(command: UpdateRolePermissionsCommand): Promise<void> {
    await this.cache.del(CacheKeys.orgPermissions(command.orgId, command.role))
  }
}
