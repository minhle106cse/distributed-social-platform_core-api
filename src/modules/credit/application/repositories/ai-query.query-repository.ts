import type { AiQueryListItemDto } from '../queries/ai-query.dto'

export interface IAiQueryQueryRepository {
  // Caller's own AI-query history, newest first, bounded.
  listForUser(orgId: string, userId: string, limit: number): Promise<AiQueryListItemDto[]>
}

export const AI_QUERY_QUERY_REPOSITORY = Symbol('IAiQueryQueryRepository')
