import { Injectable, Inject } from '@nestjs/common'
import type { IQueryHandler } from '@distributed-social-platform/shared-kernel'
import { QueryHandler } from '@/infrastructure/cqrs/decorators/query-handler.decorator'
import { FEED_QUERY_REPOSITORY } from '../feed.query-repository'
import type { IFeedQueryRepository } from '../feed.query-repository'
import type { FeedItemDto } from '../feed.dto'
import { GetFeedQuery } from './get-feed.query'

@Injectable()
@QueryHandler(GetFeedQuery)
export class GetFeedHandler implements IQueryHandler<GetFeedQuery, FeedItemDto[]> {
  constructor(@Inject(FEED_QUERY_REPOSITORY) private readonly queryRepo: IFeedQueryRepository) {}

  async execute(query: GetFeedQuery): Promise<FeedItemDto[]> {
    return this.queryRepo.getFeed({
      orgId: query.orgId,
      userId: query.userId,
      limit: query.limit,
      offset: query.offset,
    })
  }
}
