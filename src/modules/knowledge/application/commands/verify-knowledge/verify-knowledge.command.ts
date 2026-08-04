import { ICommand } from '@distributed-social-platform/shared-kernel'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// set-semantics: marks the item verified; re-applying lands on the same state.
export class VerifyKnowledgeCommand implements ICommand {
  readonly name = VerifyKnowledgeCommand.name

  constructor(
    public readonly id: string,
    public readonly verifierUserId: string,
  ) {}
}
