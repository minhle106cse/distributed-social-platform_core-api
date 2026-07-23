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
import {
  OwnerEmailAlreadyExistsError,
  AuthProvisioningUnavailableError,
} from '@/common/errors/platform-admin.error'
import { AuthProvisioningGrpcCaller } from './auth-provisioning-grpc.caller'

export interface ProvisionedOwner {
  userId: string
  temporaryPassword: string
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
 * fault) so it's handled BEFORE the breaker sees it, same reasoning as the ES
 * 404-index-missing case.
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

  async provisionUser(email: string): Promise<ProvisionedOwner> {
    // ALREADY_EXISTS resolves normally (tagged), never rejects, INSIDE the
    // caller-wrapped body — a business outcome must not trip the breaker the
    // same way a dead auth-service would. Untagged below.
    const result = await this.caller.call(
      () =>
        new Promise<ProvisionedOwner | { alreadyExists: true }>((resolve, reject) => {
          this.client.provisionUser(
            { email },
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
    if ('alreadyExists' in result) throw new OwnerEmailAlreadyExistsError()
    return result
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
