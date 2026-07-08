import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as grpc from '@grpc/grpc-js'
import {
  AuthProvisioningClient as GeneratedAuthProvisioningClient,
  type AuthProvisioningClient as IGeneratedAuthProvisioningClient,
  attachInternalGrpcSecret,
} from '@distributed-social-platform/shared-kernel'
import {
  OwnerEmailAlreadyExistsError,
  AuthProvisioningUnavailableError,
} from '@/common/errors/platform-admin.error'

export interface ProvisionedOwner {
  userId: string
  temporaryPassword: string
}

/**
 * Hand-rolled infra wrapper for the internal AuthProvisioning gRPC contract
 * (same convention as KafkaClientService — no @nestjs/microservices needed
 * for a single client). Types come from ts-proto codegen (shared-kernel
 * src/grpc/, regenerate via `npm run proto:gen`) — no hand-typed interface to
 * drift from proto/org-provisioning.proto. M2M auth via shared-secret
 * metadata, not JWT.
 */
@Injectable()
export class AuthProvisioningClient {
  private readonly client: IGeneratedAuthProvisioningClient
  private readonly sharedSecret: string
  private readonly DEADLINE_MS: number = 5000

  constructor(config: ConfigService) {
    this.sharedSecret = config.getOrThrow<string>('env.internalGrpcSharedSecret')
    this.client = new GeneratedAuthProvisioningClient(
      config.getOrThrow<string>('env.authGrpcUrl'),
      grpc.credentials.createInsecure(),
    )
  }

  private metadata(): grpc.Metadata {
    return attachInternalGrpcSecret(new grpc.Metadata(), this.sharedSecret)
  }

  private deadlineOptions(): grpc.CallOptions {
    return { deadline: Date.now() + this.DEADLINE_MS }
  }

  async provisionUser(email: string): Promise<ProvisionedOwner> {
    return new Promise((resolve, reject) => {
      this.client.provisionUser(
        { email },
        this.metadata(),
        this.deadlineOptions(),
        (err, response) => {
          if (err) {
            if (err.code === grpc.status.ALREADY_EXISTS) {
              reject(new OwnerEmailAlreadyExistsError())
              return
            }
            reject(new AuthProvisioningUnavailableError())
            return
          }
          resolve({ userId: response.userId, temporaryPassword: response.temporaryPassword })
        },
      )
    })
  }

  async cancelProvisionedUser(userId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
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
    })
  }
}
