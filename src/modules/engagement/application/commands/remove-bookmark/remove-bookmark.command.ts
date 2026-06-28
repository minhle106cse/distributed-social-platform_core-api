import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class RemoveBookmarkCommand implements ICommand {
  readonly name = 'RemoveBookmarkCommand'
  readonly options: CommandOptions = { transactional: false, retryable: false }

  constructor(
    readonly itemId: string,
    readonly userId: string,
  ) {}
}
