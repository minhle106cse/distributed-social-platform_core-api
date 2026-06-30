import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import type { IFeedQueryRepository } from '../../application/queries/feed.query-repository'
import type { FeedItemDto } from '../../application/queries/feed.dto'

@Injectable()
export class PrismaFeedQueryRepository implements IFeedQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getFeed(p: {
    orgId: string
    userId: string
    limit: number
    offset: number
  }): Promise<FeedItemDto[]> {
    const follows = await this.prisma.client.follow.findMany({
      where: { orgId: p.orgId, userId: p.userId, targetType: 'SPACE' },
      select: { targetId: true },
    })

    if (follows.length === 0) return []

    const spaceIds = follows.map((f) => f.targetId)

    const rows = await this.prisma.client.knowledgeItem.findMany({
      where: {
        orgId: p.orgId,
        spaceId: { in: spaceIds },
        status: 'PUBLISHED',
      },
      orderBy: { createdAt: 'desc' },
      take: p.limit,
      skip: p.offset,
      select: {
        id: true,
        spaceId: true,
        type: true,
        title: true,
        createdByUserId: true,
        createdAt: true,
      },
    })

    return rows.map((r) => ({
      itemId: r.id,
      spaceId: r.spaceId,
      type: r.type,
      title: r.title,
      createdByUserId: r.createdByUserId,
      createdAt: r.createdAt,
    }))
  }
}
