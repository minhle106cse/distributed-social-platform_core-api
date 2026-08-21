import { Injectable, Inject } from '@nestjs/common'
import type { IQueryHandler } from '@distributed-social-platform/shared-kernel'
import { QueryHandler } from '@/infrastructure/cqrs/decorators/query-handler.decorator'
import { ENGAGEMENT_QUERY_REPOSITORY } from '../../repositories/engagement.query-repository'
import type { IEngagementQueryRepository } from '../../repositories/engagement.query-repository'
import type { BookmarkDto } from '../engagement.dto'
import { ListBookmarksQuery } from './list-bookmarks.query'

@Injectable()
@QueryHandler(ListBookmarksQuery)
export class ListBookmarksHandler implements IQueryHandler<ListBookmarksQuery, BookmarkDto[]> {
  constructor(
    @Inject(ENGAGEMENT_QUERY_REPOSITORY) private readonly queryRepo: IEngagementQueryRepository,
  ) {}

  async execute(query: ListBookmarksQuery): Promise<BookmarkDto[]> {
    return this.queryRepo.listBookmarks(query.orgId, query.userId, query.limit, query.offset)
  }
}
