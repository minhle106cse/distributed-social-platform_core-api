import { Injectable, NestMiddleware } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { runWithTraceContext, startTraceContext } from '@distributed-social-platform/shared-kernel'

// Opens the trace-context ALS for the WHOLE request — same middleware-not-
// interceptor reasoning as TenantContextMiddleware (interceptor's Observable
// subscribe runs outside the ALS scope). Reuses the traceId of an inbound
// `traceparent` header (a request forwarded by another instrumented service)
// or starts a new trace otherwise; mints a fresh spanId for this service's
// own handling either way.
@Injectable()
export class TraceContextMiddleware implements NestMiddleware {
  use(req: FastifyRequest, _res: unknown, next: () => void): void {
    const header = req.headers['traceparent']
    const inbound = Array.isArray(header) ? header[0] : header
    runWithTraceContext(startTraceContext(inbound), () => next())
  }
}
