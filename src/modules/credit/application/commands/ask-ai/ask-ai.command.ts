import { ICommand } from '@distributed-social-platform/shared-kernel'

/**
 * UC-C2 — the paid RAG query. Saga, not a transactional command: it spans a
 * gRPC call to search-service that no database transaction can cover.
 *
 * idempotency-key: IdempotencyInterceptor on POST /api/v1/ai/ask — a client
 * retry after a timeout must replay the first response, not reserve and charge
 * a second time.
 */
export class AskAiCommand implements ICommand {
  readonly name = AskAiCommand.name

  constructor(
    public readonly orgId: string,
    public readonly userId: string,
    public readonly question: string,
    public readonly topK: number,
  ) {}
}
