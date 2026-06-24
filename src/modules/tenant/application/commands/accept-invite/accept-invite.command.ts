import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class AcceptInviteCommand implements ICommand {
  readonly name = 'AcceptInviteCommand'
  readonly options: CommandOptions = { transactional: true, retryable: false }

  constructor(
    public readonly token: string,
    public readonly userId: string,
    public readonly membershipId: string,
  ) {}
}
