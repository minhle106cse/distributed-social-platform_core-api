import { Injectable, Inject } from '@nestjs/common'
import type { IQueryHandler } from '@distributed-social-platform/shared-kernel'
import { QueryHandler } from '@/infrastructure/cqrs/decorators/query-handler.decorator'
import { ORG_ROLE_PERMISSION_REPOSITORY } from '@/modules/tenant/domain/repositories/org-role-permission.repository'
import type { IOrgRolePermissionRepository } from '@/modules/tenant/domain/repositories/org-role-permission.repository'
import { ALL_ORG_PERMISSIONS } from '@/modules/tenant/domain/org-permissions'
import type { OrgRole } from '@/modules/tenant/domain/entities/membership.entity'
import { GetRolePermissionsQuery } from './get-role-permissions.query'

export type RolePermissionsMap = Record<OrgRole, string[]>

@Injectable()
@QueryHandler(GetRolePermissionsQuery)
export class GetRolePermissionsHandler implements IQueryHandler<
  GetRolePermissionsQuery,
  RolePermissionsMap
> {
  constructor(
    @Inject(ORG_ROLE_PERMISSION_REPOSITORY) private readonly repo: IOrgRolePermissionRepository,
  ) {}

  async execute(query: GetRolePermissionsQuery): Promise<RolePermissionsMap> {
    const entries = await this.repo.findByOrg(query.orgId)

    const map: RolePermissionsMap = {
      OWNER: [...ALL_ORG_PERMISSIONS],
      ADMIN: [],
      MEMBER: [],
      GUEST: [],
    }
    for (const { role, permission } of entries) {
      // OWNER là implicit-all, bỏ qua mọi row OWNER (nếu có) để giữ nguồn sự thật nhất quán
      if (role === 'OWNER') continue
      map[role].push(permission)
    }
    return map
  }
}
