import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { IMembershipQueryRepository } from '../../application/queries/membership.query-repository'
import { MemberDto, MyOrgDto } from '../../application/queries/membership.dto'

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

  async findOrgsByUserId(userId: string): Promise<MyOrgDto[]> {
    const rows = await this.prisma.client.membership.findMany({
      where: { userId },
      include: { org: { select: { name: true, slug: true } } },
      orderBy: { joinedAt: 'asc' },
    })

    return rows.map((r) => ({
      orgId: r.orgId,
      name: r.org.name,
      slug: r.org.slug,
      role: r.role,
      joinedAt: r.joinedAt,
    }))
  }
}
