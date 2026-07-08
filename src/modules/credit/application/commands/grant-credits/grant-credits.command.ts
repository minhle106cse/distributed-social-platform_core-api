import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class GrantCreditsCommand implements ICommand {
  readonly name = GrantCreditsCommand.name
  readonly options: CommandOptions = { transactional: true, retryable: false }

  constructor(
    public readonly orgId: string,
    public readonly recipientUserId: string,
    public readonly amount: number,
    public readonly reason: string,
  ) {}
}
