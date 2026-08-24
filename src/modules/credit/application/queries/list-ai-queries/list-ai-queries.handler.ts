import { Injectable, Inject } from '@nestjs/common'
import type { IQueryHandler } from '@distributed-social-platform/shared-kernel'
import { QueryHandler } from '@/infrastructure/cqrs/decorators/query-handler.decorator'
import { AI_QUERY_QUERY_REPOSITORY } from '../../repositories/ai-query.query-repository'
import type { IAiQueryQueryRepository } from '../../repositories/ai-query.query-repository'
import type { AiQueryListItemDto } from '../ai-query.dto'
import { ListAiQueriesQuery } from './list-ai-queries.query'

const HISTORY_LIMIT = 50

@Injectable()
@QueryHandler(ListAiQueriesQuery)
export class ListAiQueriesHandler implements IQueryHandler<
  ListAiQueriesQuery,
  AiQueryListItemDto[]
> {
  constructor(
    @Inject(AI_QUERY_QUERY_REPOSITORY) private readonly aiQueryRepo: IAiQueryQueryRepository,
  ) {}

  async execute(query: ListAiQueriesQuery): Promise<AiQueryListItemDto[]> {
    return this.aiQueryRepo.listForUser(query.orgId, query.userId, HISTORY_LIMIT)
  }
}
