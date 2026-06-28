import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class UnacceptAnswerCommand implements ICommand {
  readonly name = 'UnacceptAnswerCommand'
  readonly options: CommandOptions = { transactional: false, retryable: false }

  constructor(
    readonly questionId: string,
    readonly actorUserId: string,
  ) {}
}
