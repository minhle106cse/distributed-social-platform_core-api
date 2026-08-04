import { ICommand } from '@distributed-social-platform/shared-kernel'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// idempotency-key: interceptor on POST /credits/grant — append-only ledger, granting real money.
// occ: repo.save catches P2002 on @@unique([aggregateId, version]).
export class GrantCreditsCommand implements ICommand {
  readonly name = GrantCreditsCommand.name

  constructor(
    public readonly orgId: string,
    public readonly recipientUserId: string,
    public readonly amount: number,
    public readonly reason: string,
  ) {}
}
