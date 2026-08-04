import { ICommand } from '@distributed-social-platform/shared-kernel'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// idempotency-key: @UseInterceptors(IdempotencyInterceptor) on POST /credits/spend — append-only
// ledger, no natural key. occ: repo.save catches P2002 on @@unique([aggregateId, version]).
export class SpendCreditsCommand implements ICommand {
  readonly name = SpendCreditsCommand.name

  constructor(
    public readonly orgId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly reason: string,
  ) {}
}
