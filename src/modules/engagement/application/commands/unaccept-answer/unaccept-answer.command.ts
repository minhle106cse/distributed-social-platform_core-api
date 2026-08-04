import { ICommand } from '@distributed-social-platform/shared-kernel'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// set-semantics: clears the accepted-answer pointer; re-applying lands on the same state.
export class UnacceptAnswerCommand implements ICommand {
  readonly name = UnacceptAnswerCommand.name

  constructor(
    readonly questionId: string,
    readonly actorUserId: string,
  ) {}
}
