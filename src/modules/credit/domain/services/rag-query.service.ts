export interface RagSource {
  knowledgeItemId: string
  title: string
}

export interface RagChunk {
  knowledgeItemId: string
  titleSnapshot: string
  content: string
  score: number
}

/**
 * Tagged outcome, not an exception — the adapter stays in transport vocabulary and
 * leaves "does this mean the user gets charged?" to the saga. `AI_UNAVAILABLE` is a
 * NORMAL response from a healthy search-service (it degraded internally), so it must
 * not reject and must not trip the adapter's circuit breaker; only a dead/slow
 * search-service should do that.
 */
export type RagQueryOutcome =
  | { status: 'ANSWERED'; summary: string; sources: RagSource[]; chunks: RagChunk[] }
  | { status: 'NO_RESULTS' }
  | { status: 'AI_UNAVAILABLE'; chunks: RagChunk[] }

export const RAG_QUERY_SERVICE = Symbol('RAG_QUERY_SERVICE')

/**
 * Outbound port for step ② of the AI-Query Saga — the paid RAG call into
 * search-service. Same shape and reasoning as search-service's own
 * `ISummarizerService`/`IEmbeddingService` ports: the Application layer
 * (`AskAiHandler`) orchestrates against this interface, and the transport lives in
 * an adapter (`infrastructure/grpc/rag-query.client.ts`, gRPC + breaker + deadline).
 *
 * Added 2026-08-24: `AskAiHandler` used to `import { RagQueryClient } from
 * '@/infrastructure/grpc/...'` and inject the concrete class — an Application →
 * Infrastructure dependency with no port at all, the mirror image of the
 * infra-only interfaces removed in the same pass. eslint had not caught it because
 * the application-layer boundary only listed `@/infrastructure/database/**` and
 * `@/infrastructure/http/**`; that group is now `@/infrastructure/**`.
 */
export interface IRagQueryService {
  query(orgId: string, question: string, topK: number): Promise<RagQueryOutcome>
}
