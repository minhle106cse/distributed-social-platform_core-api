import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class GrantCreditsCommand implements ICommand {
  readonly name = GrantCreditsCommand.name
  readonly options: CommandOptions = {
    transactional: true,
    // idempotency-key: interceptor on POST /credits/grant — append-only ledger, granting real money.
    // occ: repo.save catches P2002 on @@unique([aggregateId, version]).
  }

  constructor(
    public readonly orgId: string,
    public readonly recipientUserId: string,
    public readonly amount: number,
    public readonly reason: string,
  ) {}
}
