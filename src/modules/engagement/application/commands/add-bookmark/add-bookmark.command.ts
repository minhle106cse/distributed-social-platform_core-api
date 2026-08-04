import { ICommand } from '@distributed-social-platform/shared-kernel'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// natural-key + unique-constraint: Bookmark @@unique(itemId, userId) — repeat is a no-op,
// concurrent duplicate rejected.
export class AddBookmarkCommand implements ICommand {
  readonly name = AddBookmarkCommand.name

  constructor(
    readonly itemId: string,
    readonly userId: string,
  ) {}
}
