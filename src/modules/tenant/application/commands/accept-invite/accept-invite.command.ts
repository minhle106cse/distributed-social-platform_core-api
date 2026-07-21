import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class AcceptInviteCommand implements ICommand {
  readonly name = AcceptInviteCommand.name
  readonly options: CommandOptions = {
    transactional: true,
    // domain-guard: replay hits InviteAlreadyUsedError / AlreadyMemberError. unique-constraint:
    // membership @@unique([orgId, userId]) is the backstop if two accepts race past the guard.
  }

  constructor(
    public readonly token: string,
    public readonly userId: string,
  ) {}
}
