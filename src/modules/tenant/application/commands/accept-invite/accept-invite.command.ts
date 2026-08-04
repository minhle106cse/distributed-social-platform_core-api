import { ICommand } from '@distributed-social-platform/shared-kernel'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// domain-guard: replay hits InviteAlreadyUsedError / AlreadyMemberError. unique-constraint:
// membership @@unique([orgId, userId]) is the backstop if two accepts race past the guard.
export class AcceptInviteCommand implements ICommand {
  readonly name = AcceptInviteCommand.name

  constructor(
    public readonly token: string,
    public readonly userId: string,
  ) {}
}
