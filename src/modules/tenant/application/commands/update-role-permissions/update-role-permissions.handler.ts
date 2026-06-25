import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { ORG_ROLE_PERMISSION_REPOSITORY } from '@/modules/tenant/domain/repositories/org-role-permission.repository'
import type { IOrgRolePermissionRepository } from '@/modules/tenant/domain/repositories/org-role-permission.repository'
import { isValidOrgPermission } from '@/modules/tenant/domain/org-permissions'
import { OrgRole } from '@/modules/tenant/domain/entities/membership.entity'
import {
  CannotModifyOwnerPermissionsError,
  InvalidOrgPermissionError,
} from '@/common/errors/tenant.error'
import { UpdateRolePermissionsCommand } from './update-role-permissions.command'

@Injectable()
@CommandHandler(UpdateRolePermissionsCommand)
export class UpdateRolePermissionsHandler implements ICommandHandler<UpdateRolePermissionsCommand> {
  constructor(
    @Inject(ORG_ROLE_PERMISSION_REPOSITORY) private readonly repo: IOrgRolePermissionRepository,
  ) {}

  async execute(command: UpdateRolePermissionsCommand): Promise<void> {
    // Guardrail: OWNER luôn full quyền (implicit) → không cho chỉnh, chống lock-out.
    if (command.role === OrgRole.OWNER) throw new CannotModifyOwnerPermissionsError()

    // Chỉ chấp nhận permission có trong catalog (tránh dữ liệu rác / quyền rỗng nghĩa).
    const unique = [...new Set(command.permissions)]
    for (const p of unique) {
      if (!isValidOrgPermission(p)) throw new InvalidOrgPermissionError(p)
    }

    await this.repo.replaceForRole(command.orgId, command.role, unique)
  }
}
