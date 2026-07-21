import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class RemoveBookmarkCommand implements ICommand {
  readonly name = RemoveBookmarkCommand.name
  readonly options: CommandOptions = {
    transactional: false,
    // natural-key: delete by (itemId, userId) — a repeat is a no-op. none: no duplicate-race on delete.
  }

  constructor(
    readonly itemId: string,
    readonly userId: string,
  ) {}
}
