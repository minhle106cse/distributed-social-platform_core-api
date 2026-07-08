import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { ISystemAdminQueryRepository } from '../../application/queries/system-admin.query-repository'
import { OrgSummaryDto } from '../../application/queries/system-admin.dto'

@Injectable()
export class PrismaSystemAdminQueryRepository implements ISystemAdminQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listAllOrgs(limit: number, offset: number): Promise<OrgSummaryDto[]> {
    const rows = await this.prisma.client.organization.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { _count: { select: { memberships: true } } },
    })

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      seatLimit: r.seatLimit,
      createdAt: r.createdAt,
      memberCount: r._count.memberships,
    }))
  }
}
