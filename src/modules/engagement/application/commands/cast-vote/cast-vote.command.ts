import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class CastVoteCommand implements ICommand {
  readonly name = CastVoteCommand.name
  readonly options: CommandOptions = {
    transactional: false,
    // natural-key: upsert by (itemId, userId) — recasting the same value is a no-op.
    // unique-constraint: Vote @@unique(itemId, userId) rejects a concurrent duplicate row.
  }

  constructor(
    readonly itemId: string,
    readonly userId: string,
    readonly value: number,
  ) {}
}
