import { Body, Controller, Get, HttpCode, Post, UseGuards, UseInterceptors } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { CommandBus, QueryBus } from '@distributed-social-platform/shared-kernel'
import { JwtAuthGuard } from '@/infrastructure/http/guards/jwt-auth.guard'
import type { JwtPayload } from '@/infrastructure/http/guards/jwt-auth.guard'
import { OrgGuard } from '@/infrastructure/http/guards/org.guard'
import type { OrgContext } from '@/infrastructure/http/types/org-context.interface'
import { RequireOrgPermission } from '@/infrastructure/http/decorators/require-org-permission.decorator'
import { OrgPermission } from '@/modules/tenant/domain/org-rbac'
import { CurrentUser } from '@/infrastructure/http/decorators/current-user.decorator'
import { CurrentOrg } from '@/infrastructure/http/decorators/current-org.decorator'
import { ZodValidationPipe } from '@/infrastructure/http/pipes/zod-validation.pipe'
import { IdempotencyInterceptor } from '@/infrastructure/http/interceptors/idempotency.interceptor'
import { GetWalletQuery } from '../../application/queries/get-wallet/get-wallet.query'
import { GrantCreditsCommand } from '../../application/commands/grant-credits/grant-credits.command'
import { SpendCreditsCommand } from '../../application/commands/spend-credits/spend-credits.command'
import { GrantCreditsSchema } from '../schemas/grant-credits.schema'
import type { GrantCreditsDto } from '../schemas/grant-credits.schema'
import { SpendCreditsSchema } from '../schemas/spend-credits.schema'
import type { SpendCreditsDto } from '../schemas/spend-credits.schema'

@Controller('credits')
@UseGuards(JwtAuthGuard)
export class CreditController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // C1 — Get my wallet (balance + recent ledger), folded from the event stream.
  @Get('wallet')
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.CREDIT_READ)
  async wallet(@CurrentUser() user: JwtPayload, @CurrentOrg() org: OrgContext): Promise<unknown> {
    return this.queryBus.execute(new GetWalletQuery(org.orgId, user.sub))
  }

  // C2 — Grant credits to a member (source: org distributes a purchased pack).
  @Post('grant')
  @HttpCode(201)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.CREDIT_GRANT)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async grant(
    @Body(new ZodValidationPipe(GrantCreditsSchema)) body: GrantCreditsDto,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.commandBus.execute<GrantCreditsCommand, { balance: number }>(
      new GrantCreditsCommand(org.orgId, body.userId, body.amount, body.reason),
    )
  }

  // C3 — Spend my own credits (sink). Idempotent via X-Idempotency-Key; OCC guards concurrency.
  @Post('spend')
  @HttpCode(200)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.CREDIT_SPEND)
  @UseInterceptors(IdempotencyInterceptor)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async spend(
    @Body(new ZodValidationPipe(SpendCreditsSchema)) body: SpendCreditsDto,
    @CurrentUser() user: JwtPayload,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.commandBus.execute<SpendCreditsCommand, { balance: number; spent: number }>(
      new SpendCreditsCommand(org.orgId, user.sub, body.amount, body.reason),
    )
  }
}
