import { Injectable } from '@nestjs/common'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { CircuitBreaker } from '@distributed-social-platform/shared-kernel'

/**
 * SRP wrapper — the ONLY job of this class is running a call through the
 * 'system-rbac-grpc' CircuitBreaker (resilience_patterns.md §3.1.2).
 *
 * Its OWN breaker instance, separate from AuthProvisioningGrpcCaller even
 * though both talk to auth-service: org provisioning is a rare admin mutation
 * while this sits on the request path of every platform-admin call, so their
 * failure profiles and thresholds have nothing to do with each other. Sharing
 * one breaker would let a provisioning outage fail-fast every permission check.
 */
@Injectable()
export class SystemRbacGrpcCaller {
  private readonly breaker: CircuitBreaker

  constructor(@InjectPinoLogger(SystemRbacGrpcCaller.name) logger: PinoLogger) {
    this.breaker = new CircuitBreaker('system-rbac-grpc', logger)
  }

  call<T>(fn: () => Promise<T>): Promise<T> {
    return this.breaker.execute(fn)
  }
}
