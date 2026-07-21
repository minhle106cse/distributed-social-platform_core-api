import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class CreateOrgCommand implements ICommand {
  readonly name = CreateOrgCommand.name
  readonly options: CommandOptions = {
    transactional: true,
    // unique-constraint: org slug is unique → rejects a second concurrent create. none: standalone
    // HTTP idempotency is delegated to the caller (ProvisionOrg's idempotency-key interceptor).
  }

  constructor(
    public readonly orgName: string,
    public readonly slug: string,
    public readonly ownerUserId: string,
  ) {}
}
