import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class RemoveVoteCommand implements ICommand {
  readonly name = 'RemoveVoteCommand'
  readonly options: CommandOptions = { transactional: false, retryable: false }

  constructor(
    readonly itemId: string,
    readonly userId: string,
  ) {}
}
