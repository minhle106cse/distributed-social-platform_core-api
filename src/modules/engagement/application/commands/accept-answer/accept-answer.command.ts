import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class AcceptAnswerCommand implements ICommand {
  readonly name = AcceptAnswerCommand.name
  readonly options: CommandOptions = {
    transactional: true,
    // set-semantics: question.acceptAnswer(answerId) overwrites the accepted-answer pointer;
    // re-applying lands on the same state.
  }

  constructor(
    readonly questionId: string,
    readonly answerId: string,
    readonly actorUserId: string,
  ) {}
}
