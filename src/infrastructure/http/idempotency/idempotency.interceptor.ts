import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { Observable, of } from 'rxjs'
import { tap } from 'rxjs/operators'
import { Prisma } from '@/generated'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'

const MUTATION_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE']
const TTL_MS = 24 * 60 * 60 * 1000 // 24h

/**
 * Replays the first response for a repeated `X-Idempotency-Key` instead of re-running
 * the handler. Guards against client retries (timeout → resend) double-charging credit.
 * Attach per-route (never global) on expensive side-effecting mutations only.
 *
 * Note: concurrent same-key requests are still protected by aggregate OCC — this only
 * short-circuits *sequential* retries.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<FastifyRequest>()
    const key = req.headers['x-idempotency-key'] as string | undefined

    if (!key || !MUTATION_METHODS.includes(req.method)) {
      return next.handle()
    }

    const existing = await this.prisma.client.idempotencyRecord.findUnique({ where: { key } })
    if (existing) {
      return of(existing.response)
    }

    return next.handle().pipe(
      tap((response) => {
        this.prisma.client.idempotencyRecord
          .create({
            data: {
              key,
              response: response as Prisma.InputJsonValue,
              expiresAt: new Date(Date.now() + TTL_MS),
            },
          })
          .catch((err: unknown) => {
            // P2002 = a concurrent identical request already stored the record → benign.
            // Any other failure must be visible, not silently swallowed.
            if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) {
              req.log.error({ err }, 'Failed to persist idempotency record')
            }
          })
      }),
    )
  }
}
