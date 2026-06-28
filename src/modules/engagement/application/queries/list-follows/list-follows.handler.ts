import { Injectable, Inject } from '@nestjs/common'
import type { IQueryHandler } from '@distributed-social-platform/shared-kernel'
import { QueryHandler } from '@/infrastructure/cqrs/decorators/query-handler.decorator'
import { ENGAGEMENT_QUERY_REPOSITORY } from '../engagement.query-repository'
import type { IEngagementQueryRepository } from '../engagement.query-repository'
import type { FollowDto } from '../engagement.dto'
import { ListFollowsQuery } from './list-follows.query'

@Injectable()
@QueryHandler(ListFollowsQuery)
export class ListFollowsHandler implements IQueryHandler<ListFollowsQuery, FollowDto[]> {
  constructor(
    @Inject(ENGAGEMENT_QUERY_REPOSITORY) private readonly queryRepo: IEngagementQueryRepository,
  ) {}

  async execute(query: ListFollowsQuery): Promise<FollowDto[]> {
    return this.queryRepo.listFollows(query.orgId, query.userId, query.limit, query.offset)
  }
}
