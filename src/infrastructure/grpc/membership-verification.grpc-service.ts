import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import * as grpc from '@grpc/grpc-js'
import {
  type MembershipVerificationServer,
  verifyInternalGrpcSecret,
  readTraceparent,
  startTraceContext,
  runWithTraceContext,
  QueryBus,
  LogContext,
} from '@distributed-social-platform/shared-kernel'
import { CheckMembershipQuery } from '@/modules/tenant/application/queries/check-membership/check-membership.query'
import type { CheckMembershipResult } from '@/modules/tenant/application/queries/check-membership/check-membership.handler'

/**
 * Server side of proto/membership.proto — lets a service with no Membership
 * table of its own (search-service, notification-service) verify a
 * caller-supplied X-Org-Id before trusting it, instead of taking the header
 * at face value (IDOR fix, resilience_patterns.md). Delegates to QueryBus
 * (CheckMembershipQuery/Handler) instead of touching repositories directly —
 * matches every other read in core-api going through QueryBus, and matches
 * auth-service's AuthProvisioningGrpcService delegating to CommandBus rather
 * than reaching into a repository from the gRPC transport layer.
 *
 * A real Nest provider (not manually `new`'d) — `queryBus`/`logger`/the
 * shared secret are all DI-resolved via the constructor, same mechanism,
 * nothing threaded through by the caller. Mirrors the "don't carry config by
 * hand" principle auth-service achieves via `import { config }` — same
 * spirit, different mechanism because core-api commits to Nest DI throughout.
 */
@Injectable()
export class MembershipVerificationGrpcService implements MembershipVerificationServer {
  // `#`-prefixed private fields (not plain `private`) — grpc-js's generated
  // server interface requires a `[name: string]: UntypedHandleCall` index
  // signature, which plain `private` constructor-parameter properties would
  // collide with (TS2411); `#` fields live outside the string-keyed property
  // space so they're exempt.
  [name: string]: grpc.UntypedHandleCall
  #queryBus: QueryBus
  #logger: PinoLogger
  #internalGrpcSharedSecret: string

  constructor(
    queryBus: QueryBus,
    @InjectPinoLogger(MembershipVerificationGrpcService.name) logger: PinoLogger,
    config: ConfigService,
  ) {
    this.#queryBus = queryBus
    this.#logger = logger
    this.#internalGrpcSharedSecret = config.getOrThrow<string>('env.internalGrpcSharedSecret')
  }

  checkMembership: MembershipVerificationServer['checkMembership'] = (call, callback) => {
    // Continue the caller's W3C trace instead of starting a fresh one — same as
    // AuthProvisioningGrpcService. Added 2026-08-24: neither side of this hop
    // carried traceparent (the two per-service clients didn't attach it, this
    // server didn't read it), so every membership check silently broke the trace
    // chain that the other two gRPC hops maintain.
    const traceCtx = startTraceContext(readTraceparent(call))
    void runWithTraceContext(traceCtx, async () => {
      if (!verifyInternalGrpcSecret(call, this.#internalGrpcSharedSecret)) {
        // Security-relevant rejection — previously silent (2026-07-25 gateway
        // audit found this). Unlike HTTP (every 401/403 logged at the boundary
        // interceptor via status tier), gRPC has no equivalent catch-all, so
        // this branch must log itself or leave zero trace of a rejected call.
        this.#logger.warn(
          { context: LogContext.GRPC },
          'CheckMembership gRPC call rejected — invalid internal secret',
        )
        callback({ code: grpc.status.UNAUTHENTICATED, message: 'Invalid internal secret' })
        return
      }

      try {
        const { orgId, userId } = call.request
        const result = await this.#queryBus.execute<CheckMembershipQuery, CheckMembershipResult>(
          new CheckMembershipQuery(orgId, userId),
        )
        // Mirrors the HTTP boundary logging every request (success + error),
        // not just errors — gRPC boundary previously logged failures only,
        // an asymmetry vs HTTP/Kafka boundary logging (audit 2026-07-22).
        this.#logger.info(
          { context: LogContext.GRPC, orgId, isMember: result.isMember },
          'CheckMembership gRPC call succeeded',
        )
        callback(null, result)
      } catch (err) {
        this.#logger.error({ context: LogContext.GRPC, err }, 'CheckMembership gRPC call failed')
        callback({ code: grpc.status.INTERNAL, message: 'Failed to check membership' })
      }
    })
  }
}
