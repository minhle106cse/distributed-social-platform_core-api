import type { KnowledgeItemDto, KnowledgeListItemDto, RevisionDto } from '../queries/knowledge.dto'
import type { KnowledgeType, KnowledgeStatus } from '../../domain/entities/knowledge-item.entity'

export interface IKnowledgeQueryRepository {
  findItemById(id: string, orgId: string): Promise<KnowledgeItemDto | null>
  findItems(filter: {
    orgId: string
    spaceId?: string
    type?: KnowledgeType
    status?: KnowledgeStatus
    limit: number
    offset: number
  }): Promise<KnowledgeListItemDto[]>
  findRevisionsByItemId(itemId: string, orgId: string): Promise<RevisionDto[]>
}

export const KNOWLEDGE_QUERY_REPOSITORY = Symbol('IKnowledgeQueryRepository')
