import type { FeedItemDto } from './feed.dto'

export interface IFeedQueryRepository {
  getFeed(p: {
    orgId: string
    userId: string
    limit: number
    offset: number
  }): Promise<FeedItemDto[]>
}

export const FEED_QUERY_REPOSITORY = Symbol('IFeedQueryRepository')
