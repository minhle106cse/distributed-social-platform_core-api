export interface OutboxAppendInput {
  eventType: string
  aggregateType: string
  aggregateId: string
  orgId: string
  payload: unknown
}

export interface IOutboxRepository {
  append(input: OutboxAppendInput): Promise<void>
}

export const OUTBOX_REPOSITORY = Symbol('IOutboxRepository')
