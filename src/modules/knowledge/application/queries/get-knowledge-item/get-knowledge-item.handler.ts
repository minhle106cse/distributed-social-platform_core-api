import { Injectable, Inject } from '@nestjs/common'
import type { IQueryHandler } from '@distributed-social-platform/shared-kernel'
import { QueryHandler } from '@/infrastructure/cqrs/decorators/query-handler.decorator'
import { KNOWLEDGE_QUERY_REPOSITORY } from '../knowledge.query-repository'
import type { IKnowledgeQueryRepository } from '../knowledge.query-repository'
import type { KnowledgeItemDto } from '../knowledge.dto'
import { KnowledgeItemNotFoundError } from '@/common/errors/knowledge.error'
import { GetKnowledgeItemQuery } from './get-knowledge-item.query'

@Injectable()
@QueryHandler(GetKnowledgeItemQuery)
export class GetKnowledgeItemHandler implements IQueryHandler<
  GetKnowledgeItemQuery,
  KnowledgeItemDto
> {
  constructor(
    @Inject(KNOWLEDGE_QUERY_REPOSITORY) private readonly queryRepo: IKnowledgeQueryRepository,
  ) {}

  async execute(query: GetKnowledgeItemQuery): Promise<KnowledgeItemDto> {
    const item = await this.queryRepo.findItemById(query.id, query.orgId)
    if (!item) throw new KnowledgeItemNotFoundError()
    return item
  }
}
