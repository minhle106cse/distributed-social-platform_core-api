import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class AcceptAnswerCommand implements ICommand {
  readonly name = AcceptAnswerCommand.name
  readonly options: CommandOptions = { transactional: true, retryable: false }

  constructor(
    readonly questionId: string,
    readonly answerId: string,
    readonly actorUserId: string,
  ) {}
}
