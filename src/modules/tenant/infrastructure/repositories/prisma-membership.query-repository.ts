import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { IMembershipQueryRepository } from '../../application/queries/get-org-members/membership.query-repository'
import { MemberDto } from '../../application/queries/get-org-members/get-org-members.dto'

@Injectable()
export class PrismaMembershipQueryRepository implements IMembershipQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMembersByOrgId(orgId: string, limit: number, offset: number): Promise<MemberDto[]> {
    const rows = await this.prisma.client.membership.findMany({
      where: { orgId },
      orderBy: { joinedAt: 'asc' },
      take: limit,
      skip: offset,
    })

    return rows.map((r) => ({
      userId: r.userId,
      role: r.role,
      joinedAt: r.joinedAt,
    }))
  }
}
