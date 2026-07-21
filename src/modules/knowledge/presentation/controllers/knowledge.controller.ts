import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { CommandBus, QueryBus, OrgPermission } from '@distributed-social-platform/shared-kernel'
import { JwtAuthGuard } from '@/infrastructure/http/guards/jwt-auth.guard'
import type { JwtPayload } from '@/infrastructure/http/guards/jwt-auth.guard'
import { OrgGuard } from '@/infrastructure/http/guards/org.guard'
import type { OrgContext } from '@/infrastructure/http/types/org-context.interface'
import { RequireOrgPermission } from '@/infrastructure/http/decorators/require-org-permission.decorator'
import { CurrentUser } from '@/infrastructure/http/decorators/current-user.decorator'
import { CurrentOrg } from '@/infrastructure/http/decorators/current-org.decorator'
import { ZodValidationPipe } from '@/infrastructure/http/pipes/zod-validation.pipe'
import { IdempotencyInterceptor } from '@/infrastructure/http/idempotency/idempotency.interceptor'
import { CreateKnowledgeCommand } from '../../application/commands/create-knowledge/create-knowledge.command'
import { UpdateKnowledgeCommand } from '../../application/commands/update-knowledge/update-knowledge.command'
import { PublishKnowledgeCommand } from '../../application/commands/publish-knowledge/publish-knowledge.command'
import { VerifyKnowledgeCommand } from '../../application/commands/verify-knowledge/verify-knowledge.command'
import { DeleteKnowledgeCommand } from '../../application/commands/delete-knowledge/delete-knowledge.command'
import { GetKnowledgeItemQuery } from '../../application/queries/get-knowledge-item/get-knowledge-item.query'
import { ListKnowledgeItemsQuery } from '../../application/queries/list-knowledge-items/list-knowledge-items.query'
import { ListRevisionsQuery } from '../../application/queries/list-revisions/list-revisions.query'
import { CreateKnowledgeSchema } from '../schemas/create-knowledge.schema'
import type { CreateKnowledgeDto } from '../schemas/create-knowledge.schema'
import { UpdateKnowledgeSchema } from '../schemas/update-knowledge.schema'
import type { UpdateKnowledgeDto } from '../schemas/update-knowledge.schema'

@Controller()
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // E1 — Create knowledge item. Idempotent via X-Idempotency-Key — no unique
  // constraint stops a retried request from creating a duplicate document.
  @Post('knowledge')
  @HttpCode(201)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.KNOWLEDGE_WRITE)
  @UseInterceptors(IdempotencyInterceptor)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async create(
    @Body(new ZodValidationPipe(CreateKnowledgeSchema)) body: CreateKnowledgeDto,
    @CurrentUser() user: JwtPayload,
    @CurrentOrg() org: OrgContext,
  ) {
    const id = await this.commandBus.execute<CreateKnowledgeCommand, string>(
      new CreateKnowledgeCommand(
        org.orgId,
        body.spaceId,
        body.type,
        body.title,
        body.body,
        body.parentId ?? null,
        user.sub,
      ),
    )
    return { id }
  }

  // E2 — Get knowledge item by id
  @Get('knowledge/:id')
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.KNOWLEDGE_READ)
  async getById(@Param('id') id: string, @CurrentOrg() org: OrgContext): Promise<unknown> {
    return this.queryBus.execute(new GetKnowledgeItemQuery(id, org.orgId))
  }

  // E3 — List knowledge items (paginated)
  @Get('knowledge')
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.KNOWLEDGE_READ)
  async list(
    @CurrentOrg() org: OrgContext,
    @Query('spaceId') spaceId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<unknown> {
    const take = Math.min(parseInt(limit ?? '50', 10) || 50, 100)
    const skip = parseInt(offset ?? '0', 10) || 0
    return this.queryBus.execute(
      new ListKnowledgeItemsQuery(org.orgId, spaceId, type, status, take, skip),
    )
  }

  // E4 — Update knowledge item (OCC)
  @Patch('knowledge/:id')
  @HttpCode(200)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.KNOWLEDGE_WRITE)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateKnowledgeSchema)) body: UpdateKnowledgeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.commandBus.execute(
      new UpdateKnowledgeCommand(id, body.expectedVersion, body.title, body.body, user.sub),
    )
  }

  // E5 — Publish knowledge item. Idempotent via X-Idempotency-Key — the domain
  // state transition itself is a safe no-op on repeat (KnowledgeItem.publish()
  // unconditionally sets status='PUBLISHED'), but the handler appends a fresh
  // outbox event on every call regardless of prior state, so a retry still
  // triggers a real (wasted) re-embed in search-service without this guard.
  // Must return a body — the interceptor can't cache/replay a void response.
  @Post('knowledge/:id/publish')
  @HttpCode(200)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.KNOWLEDGE_WRITE)
  @UseInterceptors(IdempotencyInterceptor)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async publish(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.commandBus.execute(new PublishKnowledgeCommand(id, user.sub))
    return { id, status: 'PUBLISHED' }
  }

  // E6 — Verify knowledge item. Chỉ là 1 DB write nhẹ (không publish outbox, không
  // fan-out) — cùng mức throttle với các mutation nhẹ khác có OrgGuard (castVote,
  // follow), không cần chặt như publish/create.
  @Post('knowledge/:id/verify')
  @HttpCode(200)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.KNOWLEDGE_VERIFY)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async verify(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.commandBus.execute(new VerifyKnowledgeCommand(id, user.sub))
  }

  // E7 — Soft-delete knowledge item
  @Delete('knowledge/:id')
  @HttpCode(204)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.KNOWLEDGE_WRITE)
  async remove(@Param('id') id: string) {
    await this.commandBus.execute(new DeleteKnowledgeCommand(id))
  }

  // E8 — List revisions for a knowledge item
  @Get('knowledge/:id/revisions')
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.KNOWLEDGE_READ)
  async getRevisions(@Param('id') id: string, @CurrentOrg() org: OrgContext): Promise<unknown> {
    return this.queryBus.execute(new ListRevisionsQuery(id, org.orgId))
  }
}
