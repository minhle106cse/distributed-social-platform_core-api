import { Body, Controller, Get, HttpCode, Post, UseGuards, UseInterceptors } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Throttle } from '@nestjs/throttler'
import { CommandBus, QueryBus, OrgPermission } from '@distributed-social-platform/shared-kernel'
import { JwtAuthGuard } from '@/infrastructure/http/guards/jwt-auth.guard'
import type { JwtPayload } from '@/infrastructure/http/guards/jwt-auth.guard'
import { OrgGuard } from '@/infrastructure/http/guards/org.guard'
import { AiQuotaGuard } from '@/infrastructure/http/guards/ai-quota.guard'
import type { OrgContext } from '@/infrastructure/http/types/org-context.interface'
import { RequireOrgPermission } from '@/infrastructure/http/decorators/require-org-permission.decorator'
import { CurrentUser } from '@/infrastructure/http/decorators/current-user.decorator'
import { CurrentOrg } from '@/infrastructure/http/decorators/current-org.decorator'
import { ZodValidationPipe } from '@/infrastructure/http/pipes/zod-validation.pipe'
import { IdempotencyInterceptor } from '@/infrastructure/http/idempotency/idempotency.interceptor'
import { AskAiCommand } from '../../application/commands/ask-ai/ask-ai.command'
import type { AskAiResult } from '../../application/commands/ask-ai/ask-ai.handler'
import { ListAiQueriesQuery } from '../../application/queries/list-ai-queries/list-ai-queries.query'
import { AskAiSchema } from '../schemas/ask-ai.schema'
import type { AskAiDto } from '../schemas/ask-ai.schema'

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiQueryController {
  private readonly defaultTopK: number

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    config: ConfigService,
  ) {
    this.defaultTopK = config.getOrThrow<number>('env.aiQueryTopK')
  }

  /**
   * UC-C2 — ask the knowledge base, pay for the answer.
   *
   * Two permissions, because two different things happen: the query reads org
   * knowledge (KNOWLEDGE_READ, same as every other read of it) and it spends the
   * caller's credit (CREDIT_SPEND, same as POST /credits/spend). A role allowed
   * to read but not to spend must not be able to spend through this door.
   *
   * `IdempotencyInterceptor` is what satisfies UC-C2's "same Idempotency-Key twice
   * → not charged twice": it claims the key BEFORE the handler runs and replays
   * the stored response on a repeat. No saga-level dedup is needed on top of it.
   *
   * AiQuotaGuard runs before all of this — see its own doc for why a credit price
   * is not by itself a rate limit.
   */
  @Post('ask')
  @HttpCode(200)
  @UseGuards(OrgGuard, AiQuotaGuard)
  @RequireOrgPermission(OrgPermission.KNOWLEDGE_READ, OrgPermission.CREDIT_SPEND)
  @UseInterceptors(IdempotencyInterceptor)
  // Coarse per-instance backstop only. The real per-user limit is AiQuotaGuard's
  // token bucket, which is shared across instances; @Throttle is fixed-window and
  // in-memory, so it cannot replace it (it is kept for the same reason the search
  // endpoint has one: a cheap first line of defence).
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  async ask(
    @Body(new ZodValidationPipe(AskAiSchema)) body: AskAiDto,
    @CurrentUser() user: JwtPayload,
    @CurrentOrg() org: OrgContext,
  ): Promise<AskAiResult> {
    return this.commandBus.execute<AskAiCommand, AskAiResult>(
      new AskAiCommand(org.orgId, user.sub, body.question, body.topK ?? this.defaultTopK),
    )
  }

  // The caller's own AI-query history — including FAILED runs, so "I asked and
  // got nothing" is visible rather than silently absent.
  @Get('queries')
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.KNOWLEDGE_READ)
  async history(@CurrentUser() user: JwtPayload, @CurrentOrg() org: OrgContext): Promise<unknown> {
    return this.queryBus.execute(new ListAiQueriesQuery(org.orgId, user.sub))
  }
}
