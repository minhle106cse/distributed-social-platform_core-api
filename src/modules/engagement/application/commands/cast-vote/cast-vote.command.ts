import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class CastVoteCommand implements ICommand {
  readonly name = CastVoteCommand.name
  readonly options: CommandOptions = { transactional: false, retryable: false }

  constructor(
    readonly itemId: string,
    readonly userId: string,
    readonly value: number,
  ) {}
}
