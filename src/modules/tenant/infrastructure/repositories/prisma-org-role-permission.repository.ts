import type { Prisma, OrgRole as PrismaOrgRole } from '@/generated'
import { DEFAULT_ROLE_PERMISSIONS } from '@/modules/tenant/domain/org-rbac'
import type { OrgRole } from '@/modules/tenant/domain/org-rbac'
import type {
  IOrgRolePermissionRepository,
  OrgRolePermissionEntry,
} from '../../domain/repositories/org-role-permission.repository'

export class PrismaOrgRolePermissionRepository implements IOrgRolePermissionRepository {
  constructor(private readonly client: Prisma.TransactionClient) {}

  async seedDefaults(orgId: string): Promise<void> {
    const rows = Object.entries(DEFAULT_ROLE_PERMISSIONS).flatMap(([role, permissions]) =>
      permissions.map((permission) => ({
        orgId,
        role: role as PrismaOrgRole,
        permission,
      })),
    )
    await this.client.orgRolePermission.createMany({ data: rows })
  }

  async replaceForRole(orgId: string, role: OrgRole, permissions: string[]): Promise<void> {
    await this.client.orgRolePermission.deleteMany({
      where: { orgId, role: role },
    })
    if (permissions.length > 0) {
      await this.client.orgRolePermission.createMany({
        data: permissions.map((permission) => ({ orgId, role: role, permission })),
      })
    }
  }

  async findByOrg(orgId: string): Promise<OrgRolePermissionEntry[]> {
    const rows = await this.client.orgRolePermission.findMany({
      where: { orgId },
      select: { role: true, permission: true },
    })
    return rows.map((r) => ({ role: r.role, permission: r.permission }))
  }

  async findByOrgAndRole(orgId: string, role: OrgRole): Promise<string[]> {
    const rows = await this.client.orgRolePermission.findMany({
      where: { orgId, role: role },
      select: { permission: true },
    })
    return rows.map((r) => r.permission)
  }
}
