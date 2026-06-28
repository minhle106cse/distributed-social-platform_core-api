import type { KnowledgeItemDto, KnowledgeListItemDto, RevisionDto } from './knowledge.dto'

export interface IKnowledgeQueryRepository {
  findItemById(id: string, orgId: string): Promise<KnowledgeItemDto | null>
  findItems(filter: {
    orgId: string
    spaceId?: string
    type?: string
    status?: string
    limit: number
    offset: number
  }): Promise<KnowledgeListItemDto[]>
  findRevisionsByItemId(itemId: string, orgId: string): Promise<RevisionDto[]>
}

export const KNOWLEDGE_QUERY_REPOSITORY = Symbol('IKnowledgeQueryRepository')
