import { ICommand } from '@distributed-social-platform/shared-kernel'

export class AcceptInviteCommand implements ICommand {
  readonly name = 'AcceptInviteCommand'

  constructor(
    public readonly token: string,
    public readonly userId: string,
    public readonly membershipId: string,
    public readonly options = { transactional: true, retryable: false },
  ) {}
}
