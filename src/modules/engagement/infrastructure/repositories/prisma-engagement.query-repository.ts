import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import type { IEngagementQueryRepository } from '../../application/repositories/engagement.query-repository'
import type {
  VoteSummaryDto,
  BookmarkDto,
  FollowDto,
} from '../../application/queries/engagement.dto'

@Injectable()
export class PrismaEngagementQueryRepository implements IEngagementQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getVoteSummary(itemId: string, orgId: string, userId: string): Promise<VoteSummaryDto> {
    const [aggregate, upvotes, myVoteRow] = await Promise.all([
      this.prisma.client.vote.aggregate({
        where: { itemId, orgId },
        _sum: { value: true },
        _count: true,
      }),
      this.prisma.client.vote.count({ where: { itemId, orgId, value: 1 } }),
      this.prisma.client.vote.findFirst({ where: { itemId, userId, orgId } }),
    ])

    const total = aggregate._count
    const score = aggregate._sum.value ?? 0
    const downvotes = total - upvotes

    return {
      score,
      upvotes,
      downvotes,
      myVote: myVoteRow?.value ?? 0,
    }
  }

  async listBookmarks(
    orgId: string,
    userId: string,
    limit: number,
    offset: number,
  ): Promise<BookmarkDto[]> {
    const rows = await this.prisma.client.bookmark.findMany({
      where: { orgId, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
    return rows.map((r) => ({ itemId: r.itemId, createdAt: r.createdAt }))
  }

  async listFollows(
    orgId: string,
    userId: string,
    limit: number,
    offset: number,
  ): Promise<FollowDto[]> {
    const rows = await this.prisma.client.follow.findMany({
      where: { orgId, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
    return rows.map((r) => ({
      targetType: r.targetType,
      targetId: r.targetId,
      createdAt: r.createdAt,
    }))
  }
}
