import { ICommand } from '@distributed-social-platform/shared-kernel'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// idempotency-key: interceptor on POST /knowledge/:id/publish. domain publish() is itself
// set-semantics, but it appends an outbox event UNCONDITIONALLY every call → a retry would
// re-embed; the key guards that. none: single-aggregate write, not contended.
export class PublishKnowledgeCommand implements ICommand {
  readonly name = PublishKnowledgeCommand.name

  constructor(
    public readonly id: string,
    public readonly userId: string,
  ) {}
}
