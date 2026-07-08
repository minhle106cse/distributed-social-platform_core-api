import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class AddBookmarkCommand implements ICommand {
  readonly name = AddBookmarkCommand.name
  readonly options: CommandOptions = { transactional: false, retryable: false }

  constructor(
    readonly itemId: string,
    readonly userId: string,
  ) {}
}
