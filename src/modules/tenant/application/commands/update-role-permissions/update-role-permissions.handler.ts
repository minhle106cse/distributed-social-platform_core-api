import { Injectable } from '@nestjs/common'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { OrgRole } from '@/modules/tenant/domain/org-rbac'
import { isValidOrgPermission, logAudit } from '@distributed-social-platform/shared-kernel'
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
}
