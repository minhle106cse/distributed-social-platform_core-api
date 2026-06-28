import { Injectable, Inject } from '@nestjs/common'
import type { IQueryHandler } from '@distributed-social-platform/shared-kernel'
import { QueryHandler } from '@/infrastructure/cqrs/decorators/query-handler.decorator'
import { KNOWLEDGE_QUERY_REPOSITORY } from '../knowledge.query-repository'
import type { IKnowledgeQueryRepository } from '../knowledge.query-repository'
import type { RevisionDto } from '../knowledge.dto'
import { ListRevisionsQuery } from './list-revisions.query'

@Injectable()
@QueryHandler(ListRevisionsQuery)
export class ListRevisionsHandler implements IQueryHandler<ListRevisionsQuery, RevisionDto[]> {
  constructor(
    @Inject(KNOWLEDGE_QUERY_REPOSITORY) private readonly queryRepo: IKnowledgeQueryRepository,
  ) {}

  async execute(query: ListRevisionsQuery): Promise<RevisionDto[]> {
    return this.queryRepo.findRevisionsByItemId(query.itemId, query.orgId)
  }
}
