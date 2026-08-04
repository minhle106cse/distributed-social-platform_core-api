import { ICommand } from '@distributed-social-platform/shared-kernel'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// natural-key: delete by (itemId, userId) — a repeat is a no-op. none: no duplicate-race on delete.
export class RemoveBookmarkCommand implements ICommand {
  readonly name = RemoveBookmarkCommand.name

  constructor(
    readonly itemId: string,
    readonly userId: string,
  ) {}
}
