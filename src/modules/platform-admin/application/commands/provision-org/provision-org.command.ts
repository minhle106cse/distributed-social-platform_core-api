import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

// System-Admin-only: provisions a brand new org together with its owner
// account (cross-service — the owner is created in auth-service via gRPC).
// transactional:false on purpose: the "transaction" here is an app-level saga
// with compensation, not a Prisma tx, and it calls out to gRPC — auto-retrying
// it would double-provision the owner if the first attempt actually succeeded
// but the response was lost. Since RetryMiddleware only fires for
// transactional:true commands, this is safe by construction, not opt-out.
export class ProvisionOrgCommand implements ICommand {
  readonly name = ProvisionOrgCommand.name
  readonly options: CommandOptions = {
    transactional: false,
    // idempotency-key: interceptor on POST /admin/orgs — cross-service saga (gRPC provision user +
    // create org), biggest blast radius. unique-constraint: reuses CreateOrg's slug uniqueness.
    // Failure recovery is the handler's compensation + AuthProvisioningGrpcCaller's circuit breaker,
    // not auto-retry.
  }

  constructor(
    public readonly orgName: string,
    public readonly slug: string,
    public readonly ownerEmail: string,
  ) {}
}
