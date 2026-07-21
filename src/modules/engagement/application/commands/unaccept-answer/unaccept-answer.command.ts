import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class UnacceptAnswerCommand implements ICommand {
  readonly name = UnacceptAnswerCommand.name
  readonly options: CommandOptions = {
    transactional: false,
    // set-semantics: clears the accepted-answer pointer; re-applying lands on the same state.
  }

  constructor(
    readonly questionId: string,
    readonly actorUserId: string,
  ) {}
}
