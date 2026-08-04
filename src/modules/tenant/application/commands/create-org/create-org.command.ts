import { ICommand } from '@distributed-social-platform/shared-kernel'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// unique-constraint: org slug is unique → rejects a second concurrent create. none: standalone
// HTTP idempotency is delegated to the caller (ProvisionOrg's idempotency-key interceptor).
export class CreateOrgCommand implements ICommand {
  readonly name = CreateOrgCommand.name

  constructor(
    public readonly orgName: string,
    public readonly slug: string,
    public readonly ownerUserId: string,
  ) {}
}
