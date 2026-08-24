export interface ProvisionedOwner {
  userId: string
  temporaryPassword: string
}

/**
 * Tagged, non-error outcome — the adapter stays in transport vocabulary and leaves
 * deciding what "email taken" MEANS to the caller (same layering
 * `CreateOrgHandler`/`AcceptInviteHandler` use for their own already-exists checks:
 * infra returns data, the application-layer handler throws the ApplicationError).
 * Untagged by `ProvisionOrgHandler`, not by the adapter.
 */
export interface OwnerEmailAlreadyExists {
  alreadyExists: true
}

export const AUTH_PROVISIONING_SERVICE = Symbol('AUTH_PROVISIONING_SERVICE')

/**
 * Outbound port for the cross-service half of `ProvisionOrgHandler`'s saga:
 * creating (and, on compensation, cancelling) the owner account that lives in
 * auth-service's database. The adapter is
 * `infrastructure/grpc/auth-provisioning.client.ts` (gRPC + shared-secret metadata
 * + breaker + deadline).
 *
 * Added 2026-08-24 for the same reason as `IRagQueryService` — the handler used to
 * inject the concrete `AuthProvisioningClient` straight out of `@/infrastructure`.
 */
export interface IAuthProvisioningService {
  /**
   * `idempotencyKey` is threaded through so a genuine client retry recovers the
   * SAME user from auth-service's own record instead of orphaning a second one.
   */
  provisionUser(
    email: string,
    idempotencyKey?: string,
  ): Promise<ProvisionedOwner | OwnerEmailAlreadyExists>

  /** Compensation for `provisionUser`. Returns whether a user was actually cancelled. */
  cancelProvisionedUser(userId: string): Promise<boolean>
}
