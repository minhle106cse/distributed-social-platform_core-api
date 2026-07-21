import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class AddBookmarkCommand implements ICommand {
  readonly name = AddBookmarkCommand.name
  readonly options: CommandOptions = {
    transactional: false,
    // natural-key + unique-constraint: Bookmark @@unique(itemId, userId) — repeat is a no-op,
    // concurrent duplicate rejected.
  }

  constructor(
    readonly itemId: string,
    readonly userId: string,
  ) {}
}
