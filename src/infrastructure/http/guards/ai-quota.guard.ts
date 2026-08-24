import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { FastifyRequest } from 'fastify'
import { Prisma } from '@/generated'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import type { JwtPayload } from './jwt-auth.guard'
import type { OrgContext } from '../types/org-context.interface'

/**
 * Token bucket for AI queries, one bucket per (org, user). Runs AFTER OrgGuard
 * (it needs the verified orgId, never the raw header).
 *
 * WHY THIS EXISTS WHEN THE QUERY ALREADY COSTS CREDIT: price is a budget, not a
 * rate. A user with 500 credits can legitimately fire 200 queries in ten seconds
 * and take the Claude/Ollama bill (and their latency) with them. The bucket
 * bounds the BURST; credit bounds the total. `@Throttle` cannot stand in for it —
 * it is a fixed window held in each instance's memory, so N instances multiply
 * the real limit by N and a window boundary lets through 2× in an instant.
 *
 * Postgres, not Redis: Redis is in docker-compose with zero lines of code behind
 * it, so reaching for it here means a new client, config, health check and
 * shutdown path for one counter. Refill and consume happen in ONE
 * `UPDATE ... RETURNING`, which is atomic across instances without any of that.
 */
@Injectable()
export class AiQuotaGuard implements CanActivate {
  private readonly capacity: number
  private readonly refillPerMinute: number

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.capacity = config.getOrThrow<number>('env.aiQuotaCap')
    this.refillPerMinute = config.getOrThrow<number>('env.aiQuotaRefillPerMin')
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: JwtPayload; org?: OrgContext }>()
    const orgId = request.org?.orgId
    const userId = request.user?.sub
    // No verified org/user yet means OrgGuard has not run (or rejected) — not
    // this guard's call to make. Never invent a bucket for an unknown caller.
    if (!orgId || !userId) return true

    if (!(await this.consumeToken(orgId, userId))) {
      // 429 RATE_LIMITED — the code docs/06_api_contracts.md already publishes
      // for "AI quota exceeded".
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'AI query rate limit exceeded; try again shortly' },
        429,
      )
    }
    return true
  }

  /**
   * Refill-then-consume in a single statement, so two concurrent requests cannot
   * both read the same "tokens" value and both spend it (the classic read-modify-
   * write race a SELECT-then-UPDATE version has).
   *
   * The first request from a (org,user) has no row: `ON CONFLICT DO NOTHING`
   * inserts a full bucket, then the UPDATE below consumes from it. Insert and
   * update are separate statements on purpose — an upsert that also refills would
   * have to express "refill only if the row already existed" inside the same
   * expression, which is where this kind of SQL usually goes wrong.
   */
  private async consumeToken(orgId: string, userId: string): Promise<boolean> {
    await this.prisma.client.$executeRaw`
      INSERT INTO ai_quota_buckets (org_id, user_id, tokens, last_refill_at)
      VALUES (${orgId}, ${userId}, ${this.capacity}, now())
      ON CONFLICT (org_id, user_id) DO NOTHING
    `

    const updated = await this.prisma.client.$queryRaw<Array<{ tokens: number }>>(Prisma.sql`
      UPDATE ai_quota_buckets
      SET tokens = LEAST(
            ${this.capacity}::double precision,
            tokens + EXTRACT(EPOCH FROM (now() - last_refill_at)) / 60
                     * ${this.refillPerMinute}::double precision
          ) - 1,
          last_refill_at = now()
      WHERE org_id = ${orgId}
        AND user_id = ${userId}
        AND LEAST(
              ${this.capacity}::double precision,
              tokens + EXTRACT(EPOCH FROM (now() - last_refill_at)) / 60
                       * ${this.refillPerMinute}::double precision
            ) >= 1
      RETURNING tokens
    `)

    // No row returned = the WHERE clause rejected it = not enough tokens even
    // after refill. Nothing was written, so a rejected request costs no quota.
    return updated.length > 0
  }
}
