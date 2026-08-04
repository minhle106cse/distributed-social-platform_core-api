import { ICommand } from '@distributed-social-platform/shared-kernel'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// natural-key: upsert by (itemId, userId) — recasting the same value is a no-op.
// unique-constraint: Vote @@unique(itemId, userId) rejects a concurrent duplicate row.
export class CastVoteCommand implements ICommand {
  readonly name = CastVoteCommand.name

  constructor(
    readonly itemId: string,
    readonly userId: string,
    readonly value: number,
  ) {}
}
