import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class PublishKnowledgeCommand implements ICommand {
  readonly name = PublishKnowledgeCommand.name
  readonly options: CommandOptions = {
    transactional: true,
    // idempotency-key: interceptor on POST /knowledge/:id/publish. domain publish() is itself
    // set-semantics, but it appends an outbox event UNCONDITIONALLY every call → a retry would
    // re-embed; the key guards that. none: single-aggregate write, not contended.
  }

  constructor(
    public readonly id: string,
    public readonly userId: string,
  ) {}
}
