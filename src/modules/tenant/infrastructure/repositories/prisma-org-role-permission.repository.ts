import { Injectable } from '@nestjs/common'
import type { Prisma, OrgRole as PrismaOrgRole } from '@/generated'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { getTx } from '@/common/database/transaction.context'
import { DEFAULT_ROLE_PERMISSIONS } from '@/common/tenant/org-permissions'
import type { OrgRole } from '@/common/tenant/org-permissions'
import type {
  IOrgRolePermissionRepository,
  OrgRolePermissionEntry,
} from '../../domain/repositories/org-role-permission.repository'

@Injectable()
export class PrismaOrgRolePermissionRepository implements IOrgRolePermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get client(): Prisma.TransactionClient {
    return (getTx<Prisma.TransactionClient>() ?? this.prisma) as Prisma.TransactionClient
  }

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
      where: { orgId, role: role as PrismaOrgRole },
    })
    if (permissions.length > 0) {
      await this.client.orgRolePermission.createMany({
        data: permissions.map((permission) => ({ orgId, role: role as PrismaOrgRole, permission })),
      })
    }
  }

  async findByOrg(orgId: string): Promise<OrgRolePermissionEntry[]> {
    const rows = await this.client.orgRolePermission.findMany({
      where: { orgId },
      select: { role: true, permission: true },
    })
    return rows.map((r) => ({ role: r.role as OrgRole, permission: r.permission }))
  }

  async findByOrgAndRole(orgId: string, role: OrgRole): Promise<string[]> {
    const rows = await this.client.orgRolePermission.findMany({
      where: { orgId, role: role as PrismaOrgRole },
      select: { permission: true },
    })
    return rows.map((r) => r.permission)
  }
}
