import type { VoteSummaryDto, BookmarkDto, FollowDto } from '../queries/engagement.dto'

export interface IEngagementQueryRepository {
  getVoteSummary(itemId: string, orgId: string, userId: string): Promise<VoteSummaryDto>
  listBookmarks(
    orgId: string,
    userId: string,
    limit: number,
    offset: number,
  ): Promise<BookmarkDto[]>
  listFollows(orgId: string, userId: string, limit: number, offset: number): Promise<FollowDto[]>
}

export const ENGAGEMENT_QUERY_REPOSITORY = Symbol('IEngagementQueryRepository')
