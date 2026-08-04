import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import type { OrgRole } from '@/modules/tenant/domain/org-rbac'
import type {
  IOrgRolePermissionReader,
  OrgRolePermissionEntry,
} from '../../domain/repositories/org-role-permission.repository'

/** Read side on the plain client — no transaction, so callable from a guard. */
@Injectable()
export class PrismaOrgRolePermissionQueryRepository implements IOrgRolePermissionReader {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrg(orgId: string): Promise<OrgRolePermissionEntry[]> {
    const rows = await this.prisma.client.orgRolePermission.findMany({
      where: { orgId },
      select: { role: true, permission: true },
    })
    return rows.map((r) => ({ role: r.role, permission: r.permission }))
  }

  async findByOrgAndRole(orgId: string, role: OrgRole): Promise<string[]> {
    const rows = await this.prisma.client.orgRolePermission.findMany({
      where: { orgId, role },
      select: { permission: true },
    })
    return rows.map((r) => r.permission)
  }
}
