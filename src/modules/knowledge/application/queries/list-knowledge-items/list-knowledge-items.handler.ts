import { Injectable, Inject } from '@nestjs/common'
import type { IQueryHandler } from '@distributed-social-platform/shared-kernel'
import { QueryHandler } from '@/infrastructure/cqrs/decorators/query-handler.decorator'
import { KNOWLEDGE_QUERY_REPOSITORY } from '../knowledge.query-repository'
import type { IKnowledgeQueryRepository } from '../knowledge.query-repository'
import type { KnowledgeListItemDto } from '../knowledge.dto'
import { ListKnowledgeItemsQuery } from './list-knowledge-items.query'

@Injectable()
@QueryHandler(ListKnowledgeItemsQuery)
export class ListKnowledgeItemsHandler implements IQueryHandler<
  ListKnowledgeItemsQuery,
  KnowledgeListItemDto[]
> {
  constructor(
    @Inject(KNOWLEDGE_QUERY_REPOSITORY) private readonly queryRepo: IKnowledgeQueryRepository,
  ) {}

  async execute(query: ListKnowledgeItemsQuery): Promise<KnowledgeListItemDto[]> {
    return this.queryRepo.findItems({
      orgId: query.orgId,
      spaceId: query.spaceId,
      type: query.type,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    })
  }
}
