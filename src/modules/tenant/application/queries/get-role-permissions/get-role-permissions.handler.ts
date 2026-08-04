import { Injectable, Inject } from '@nestjs/common'
import type { IQueryHandler } from '@distributed-social-platform/shared-kernel'
import { QueryHandler } from '@/infrastructure/cqrs/decorators/query-handler.decorator'
import { ORG_ROLE_PERMISSION_READER } from '@/modules/tenant/domain/repositories/org-role-permission.repository'
import type { IOrgRolePermissionReader } from '@/modules/tenant/domain/repositories/org-role-permission.repository'
import { OrgRole } from '@/modules/tenant/domain/org-rbac'
import { OrgPermissionResolver } from '@/modules/tenant/domain/services/resolve-org-permissions'
import { GetRolePermissionsQuery } from './get-role-permissions.query'

export type RolePermissionsMap = Record<OrgRole, string[]>

@Injectable()
@QueryHandler(GetRolePermissionsQuery)
export class GetRolePermissionsHandler implements IQueryHandler<
  GetRolePermissionsQuery,
  RolePermissionsMap
> {
  constructor(
    @Inject(ORG_ROLE_PERMISSION_READER) private readonly repo: IOrgRolePermissionReader,
    private readonly permissionResolver: OrgPermissionResolver,
  ) {}

  async execute(query: GetRolePermissionsQuery): Promise<RolePermissionsMap> {
    const entries = await this.repo.findByOrg(query.orgId)

    const map: RolePermissionsMap = {
      // OWNER implicit-all resolved via OrgPermissionResolver (single source
      // of truth, same as OrgGuard/CheckMembershipHandler) instead of
      // hardcoding ALL_ORG_PERMISSIONS a second time in this file.
      OWNER: await this.permissionResolver.resolve(query.orgId, OrgRole.OWNER),
      ADMIN: [],
      MEMBER: [],
      GUEST: [],
    }
    for (const { role, permission } of entries) {
      // OWNER là implicit-all, bỏ qua mọi row OWNER (nếu có) để giữ nguồn sự thật nhất quán
      if (role === OrgRole.OWNER) continue
      map[role].push(permission)
    }
    return map
  }
}
