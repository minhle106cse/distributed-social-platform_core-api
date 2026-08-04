import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as grpc from '@grpc/grpc-js'
import {
  AuthProvisioningClient as GeneratedAuthProvisioningClient,
  type AuthProvisioningClient as IGeneratedAuthProvisioningClient,
  attachInternalGrpcSecret,
  attachTraceparent,
  getCurrentTraceparent,
} from '@distributed-social-platform/shared-kernel'
import { AuthProvisioningUnavailableError } from '@/common/errors/platform-admin.error'
import { AuthProvisioningGrpcCaller } from './auth-provisioning-grpc.caller'

export interface ProvisionedOwner {
  userId: string
  temporaryPassword: string
}

/** Tagged, non-error outcome — the client stays in transport vocabulary and
 * leaves deciding what "email taken" MEANS to the caller (same layering
 * `CreateOrgHandler`/`AcceptInviteHandler` use for their own already-exists
 * checks: infra returns data, the application-layer handler throws the
 * ApplicationError). Untagged by `ProvisionOrgHandler`, not here. */
export interface OwnerEmailAlreadyExists {
  alreadyExists: true
}

const DEADLINE_MS = 5000

/**
 * Hand-rolled infra wrapper for the internal AuthProvisioning gRPC contract
 * (same convention as KafkaClientService — no @nestjs/microservices needed
 * for a single client). Types come from ts-proto codegen (shared-kernel
 * src/grpc/, regenerate via `npm run proto:gen`) — no hand-typed interface to
 * drift from proto/org-provisioning.proto. M2M auth via shared-secret
 * metadata, not JWT.
 *
 * `AuthProvisioningGrpcCaller` protects the calls (Circuit Breaker) on top of
 * the existing per-call deadline (resilience_patterns.md §3.1): the deadline
 * already bounds a SINGLE call, but during a real auth-service outage every
 * provisioning attempt would still wait the full 5s before failing — the
 * breaker fails fast after repeated failures instead. Both methods inject the
 * SAME caller instance, so they share one breaker/state, matching the
 * pre-refactor behavior. `ALREADY_EXISTS` is a normal business outcome (not a
 * fault) so it's tagged and resolved (not rejected) INSIDE the caller-wrapped
 * body, same reasoning as the ES 404-index-missing case — the breaker must
 * never see it as a failure.
 *
 * 2026-08-04: this class used to throw `OwnerEmailAlreadyExistsError` itself
 * for the ALREADY_EXISTS case — an application-level error thrown from an
 * infra adapter, inconsistent with how every other "already exists" error in
 * this codebase is thrown (`CreateOrgHandler`/`AcceptInviteHandler` throw
 * from the application layer, after inspecting data the infra layer just
 * returned). Fixed: `provisionUser` now returns the tagged
 * `OwnerEmailAlreadyExists` union member instead of throwing it — deciding
 * what that means is `ProvisionOrgHandler`'s job now.
 */
@Injectable()
export class AuthProvisioningClient implements OnModuleDestroy {
  private readonly client: IGeneratedAuthProvisioningClient
  private readonly sharedSecret: string

  constructor(
    config: ConfigService,
    private readonly caller: AuthProvisioningGrpcCaller,
  ) {
    this.sharedSecret = config.getOrThrow<string>('env.internalGrpcSharedSecret')
    this.client = new GeneratedAuthProvisioningClient(
      config.getOrThrow<string>('env.authGrpcUrl'),
      grpc.credentials.createInsecure(),
    )
  }

  onModuleDestroy(): void {
    this.client.close()
  }

  private metadata(): grpc.Metadata {
    const metadata = attachInternalGrpcSecret(new grpc.Metadata(), this.sharedSecret)
    return attachTraceparent(metadata, getCurrentTraceparent())
  }

  private deadlineOptions(): grpc.CallOptions {
    return { deadline: Date.now() + DEADLINE_MS }
  }

  async provisionUser(
    email: string,
    idempotencyKey?: string,
  ): Promise<ProvisionedOwner | OwnerEmailAlreadyExists> {
    // ALREADY_EXISTS resolves normally (tagged), never rejects, INSIDE the
    // caller-wrapped body — a business outcome must not trip the breaker the
    // same way a dead auth-service would.
    return this.caller.call(
      () =>
        new Promise<ProvisionedOwner | OwnerEmailAlreadyExists>((resolve, reject) => {
          this.client.provisionUser(
            { email, idempotencyKey: idempotencyKey ?? '' },
            this.metadata(),
            this.deadlineOptions(),
            (err, response) => {
              if (err) {
                if (err.code === grpc.status.ALREADY_EXISTS) {
                  resolve({ alreadyExists: true })
                  return
                }
                reject(new AuthProvisioningUnavailableError())
                return
              }
              resolve({ userId: response.userId, temporaryPassword: response.temporaryPassword })
            },
          )
        }),
    )
  }

  async cancelProvisionedUser(userId: string): Promise<boolean> {
    return this.caller.call(
      () =>
        new Promise((resolve, reject) => {
          this.client.cancelProvisionedUser(
            { userId },
            this.metadata(),
            this.deadlineOptions(),
            (err, response) => {
              if (err) {
                reject(new AuthProvisioningUnavailableError())
                return
              }
              resolve(response.cancelled)
            },
          )
        }),
    )
  }
}
