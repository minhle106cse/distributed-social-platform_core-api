import { ICommand } from '@distributed-social-platform/shared-kernel'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// set-semantics: question.acceptAnswer(answerId) overwrites the accepted-answer pointer;
// re-applying lands on the same state.
export class AcceptAnswerCommand implements ICommand {
  readonly name = AcceptAnswerCommand.name

  constructor(
    readonly questionId: string,
    readonly answerId: string,
    readonly actorUserId: string,
  ) {}
}
