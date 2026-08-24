export interface AiQueryRecordInput {
  orgId: string
  userId: string
  question: string
  answer: string | null
  sources: Array<{ knowledgeItemId: string; title: string }>
  creditCost: number
  status: 'ANSWERED' | 'FAILED'
  reservationId: string
}

/**
 * Write port for the AI-Query Saga's own record of a run.
 *
 * Lives in `domain/repositories/` (not `application/`) per step 1 of
 * cqrs_pattern.md's placement rule: it has a write method, so it is part of the
 * transactional scope regardless of who imports it.
 */
export interface IAiQueryRepository {
  /**
   * Insert the record for one saga run, keyed by `reservationId`.
   *
   * UPSERT, not insert: the FAILED write happens inside a saga compensation, and
   * `SagaCompensationReaperService` re-runs a failed compensation from durable
   * storage. A second attempt must land on the same row rather than blowing up on
   * the unique constraint and being counted as another compensation failure.
   */
  record(input: AiQueryRecordInput): Promise<string>
}
