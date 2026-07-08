import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class SpendCreditsCommand implements ICommand {
  readonly name = SpendCreditsCommand.name
  readonly options: CommandOptions = { transactional: true, retryable: false }

  constructor(
    public readonly orgId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly reason: string,
  ) {}
}
