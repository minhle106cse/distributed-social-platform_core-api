import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

// System-Admin-only: provisions a brand new org together with its owner
// account (cross-service — the owner is created in auth-service via gRPC).
// Not retryable: retrying blindly would double-provision the owner if the
// first attempt actually succeeded but the response was lost.
export class ProvisionOrgCommand implements ICommand {
  readonly name = ProvisionOrgCommand.name
  readonly options: CommandOptions = { transactional: false, retryable: false }

  constructor(
    public readonly orgName: string,
    public readonly slug: string,
    public readonly ownerEmail: string,
  ) {}
}
