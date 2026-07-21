import { Injectable } from '@nestjs/common'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { CircuitBreaker } from '@distributed-social-platform/shared-kernel'

/**
 * SRP wrapper — the ONLY job of this class is running a call through the
 * 'auth-provisioning-grpc' CircuitBreaker (resilience_patterns.md §3.1.2).
 * gRPC metadata/deadline construction and business-outcome handling
 * (ALREADY_EXISTS tagging) stay in AuthProvisioningClient, which injects
 * this. Both provisionUser and cancelProvisionedUser use the SAME instance —
 * same breaker/state for both, matching the pre-refactor behavior where they
 * shared one `this.breaker` field.
 */
@Injectable()
export class AuthProvisioningGrpcCaller {
  private readonly breaker: CircuitBreaker

  constructor(@InjectPinoLogger(AuthProvisioningGrpcCaller.name) logger: PinoLogger) {
    this.breaker = new CircuitBreaker('auth-provisioning-grpc', logger)
  }

  call<T>(fn: () => Promise<T>): Promise<T> {
    return this.breaker.execute(fn)
  }
}
