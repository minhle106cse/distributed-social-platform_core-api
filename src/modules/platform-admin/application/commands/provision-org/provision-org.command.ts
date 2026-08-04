import { ICommand } from '@distributed-social-platform/shared-kernel'

// System-Admin-only: provisions a brand new org together with its owner
// account (cross-service — the owner is created in auth-service via gRPC).
// transactional:false on purpose: the "transaction" here is an app-level saga
// with compensation, not a Prisma tx, and it calls out to gRPC — auto-retrying
// it would double-provision the owner if the first attempt actually succeeded
// but the response was lost. Since RetryMiddleware only fires for
// transactional:true commands, this is safe by construction, not opt-out.
// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// idempotency-key: interceptor on POST /admin/orgs — cross-service saga (gRPC provision user +
// create org), biggest blast radius. unique-constraint: reuses CreateOrg's slug uniqueness.
// Failure recovery is the handler's compensation + AuthProvisioningGrpcCaller's circuit breaker,
// not auto-retry.
export class ProvisionOrgCommand implements ICommand {
  readonly name = ProvisionOrgCommand.name

  constructor(
    public readonly orgName: string,
    public readonly slug: string,
    public readonly ownerEmail: string,
    public readonly actorUserId: string,
    // Threaded from the HTTP X-Idempotency-Key into the gRPC ProvisionUser call
    // (review of ADR-0001, 2026-07-30) — lets a genuine client retry (same key)
    // recover the SAME provisioned user via auth-service's own idempotency
    // record instead of orphaning a second one when the first gRPC response
    // was lost after auth-service had already committed. Undefined = caller
    // sent no key (best-effort only, matches pre-existing behavior).
    public readonly idempotencyKey?: string,
  ) {}
}
