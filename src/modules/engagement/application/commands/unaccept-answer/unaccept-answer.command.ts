import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class UnacceptAnswerCommand implements ICommand {
  readonly name = UnacceptAnswerCommand.name
  readonly options: CommandOptions = { transactional: false, retryable: false }

  constructor(
    readonly questionId: string,
    readonly actorUserId: string,
  ) {}
}
