import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class SpendCreditsCommand implements ICommand {
  readonly name = SpendCreditsCommand.name
  readonly options: CommandOptions = {
    transactional: true,
    // idempotency-key: @UseInterceptors(IdempotencyInterceptor) on POST /credits/spend — append-only
    // ledger, no natural key. occ: repo.save catches P2002 on @@unique([aggregateId, version]).
  }

  constructor(
    public readonly orgId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly reason: string,
  ) {}
}
