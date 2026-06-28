import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { CommandBus, QueryBus } from '@distributed-social-platform/shared-kernel'
import { JwtAuthGuard } from '@/infrastructure/http/guards/jwt-auth.guard'
import type { JwtPayload } from '@/infrastructure/http/guards/jwt-auth.guard'
import { OrgGuard } from '@/infrastructure/http/guards/org.guard'
import type { OrgContext } from '@/infrastructure/http/types/org-context.interface'
import { RequireOrgPermission } from '@/infrastructure/http/decorators/require-org-permission.decorator'
import { OrgPermission } from '@/modules/tenant/domain/org-permissions'
import { CurrentUser } from '@/infrastructure/http/decorators/current-user.decorator'
import { CurrentOrg } from '@/infrastructure/http/decorators/current-org.decorator'
import { ZodValidationPipe } from '@/infrastructure/http/pipes/zod-validation.pipe'
import { CastVoteCommand } from '../../application/commands/cast-vote/cast-vote.command'
import { RemoveVoteCommand } from '../../application/commands/remove-vote/remove-vote.command'
import { AddBookmarkCommand } from '../../application/commands/add-bookmark/add-bookmark.command'
import { RemoveBookmarkCommand } from '../../application/commands/remove-bookmark/remove-bookmark.command'
import { AcceptAnswerCommand } from '../../application/commands/accept-answer/accept-answer.command'
import { UnacceptAnswerCommand } from '../../application/commands/unaccept-answer/unaccept-answer.command'
import { FollowTargetCommand } from '../../application/commands/follow-target/follow-target.command'
import { UnfollowTargetCommand } from '../../application/commands/unfollow-target/unfollow-target.command'
import { GetVoteSummaryQuery } from '../../application/queries/get-vote-summary/get-vote-summary.query'
import { ListBookmarksQuery } from '../../application/queries/list-bookmarks/list-bookmarks.query'
import { ListFollowsQuery } from '../../application/queries/list-follows/list-follows.query'
import { CastVoteSchema } from '../schemas/cast-vote.schema'
import type { CastVoteDto } from '../schemas/cast-vote.schema'
import { FollowSchema } from '../schemas/follow.schema'
import type { FollowDto } from '../schemas/follow.schema'
import { AcceptAnswerSchema } from '../schemas/accept-answer.schema'
import type { AcceptAnswerDto } from '../schemas/accept-answer.schema'

@Controller()
@UseGuards(JwtAuthGuard)
export class EngagementController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // E1 — Cast vote (idempotent set)
  @Put('knowledge/:id/vote')
  @HttpCode(204)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.ENGAGEMENT_VOTE)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async castVote(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CastVoteSchema)) body: CastVoteDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.commandBus.execute(new CastVoteCommand(id, user.sub, body.value))
  }

  // E2 — Remove vote (idempotent)
  @Delete('knowledge/:id/vote')
  @HttpCode(204)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.ENGAGEMENT_VOTE)
  async removeVote(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.commandBus.execute(new RemoveVoteCommand(id, user.sub))
  }

  // E3 — Get vote summary
  @Get('knowledge/:id/vote-summary')
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.KNOWLEDGE_READ)
  async getVoteSummary(
    @Param('id') id: string,
    @CurrentOrg() org: OrgContext,
    @CurrentUser() user: JwtPayload,
  ): Promise<unknown> {
    return this.queryBus.execute(new GetVoteSummaryQuery(id, org.orgId, user.sub))
  }

  // E4 — Add bookmark (idempotent)
  @Put('knowledge/:id/bookmark')
  @HttpCode(204)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.ENGAGEMENT_BOOKMARK)
  async addBookmark(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.commandBus.execute(new AddBookmarkCommand(id, user.sub))
  }

  // E5 — Remove bookmark (idempotent)
  @Delete('knowledge/:id/bookmark')
  @HttpCode(204)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.ENGAGEMENT_BOOKMARK)
  async removeBookmark(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.commandBus.execute(new RemoveBookmarkCommand(id, user.sub))
  }

  // E6 — List my bookmarks (scoped to org)
  @Get('bookmarks')
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.KNOWLEDGE_READ)
  async listBookmarks(
    @CurrentOrg() org: OrgContext,
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<unknown> {
    const take = Math.min(parseInt(limit ?? '50', 10) || 50, 100)
    const skip = parseInt(offset ?? '0', 10) || 0
    return this.queryBus.execute(new ListBookmarksQuery(org.orgId, user.sub, take, skip))
  }

  // E7 — Accept answer
  @Post('knowledge/:id/accept-answer')
  @HttpCode(200)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.ENGAGEMENT_ACCEPT_ANSWER)
  async acceptAnswer(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AcceptAnswerSchema)) body: AcceptAnswerDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.commandBus.execute(new AcceptAnswerCommand(id, body.answerId, user.sub))
  }

  // E8 — Unaccept answer
  @Delete('knowledge/:id/accept-answer')
  @HttpCode(204)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.ENGAGEMENT_ACCEPT_ANSWER)
  async unacceptAnswer(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.commandBus.execute(new UnacceptAnswerCommand(id, user.sub))
  }

  // E9 — Follow target (idempotent)
  @Put('follows')
  @HttpCode(204)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.ENGAGEMENT_FOLLOW)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async follow(
    @Body(new ZodValidationPipe(FollowSchema)) body: FollowDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.commandBus.execute(new FollowTargetCommand(user.sub, body.targetType, body.targetId))
  }

  // E10 — Unfollow target (idempotent, DELETE with body)
  @Delete('follows')
  @HttpCode(204)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.ENGAGEMENT_FOLLOW)
  async unfollow(
    @Body(new ZodValidationPipe(FollowSchema)) body: FollowDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.commandBus.execute(
      new UnfollowTargetCommand(user.sub, body.targetType, body.targetId),
    )
  }

  // E11 — List my follows (scoped to org)
  @Get('follows')
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.KNOWLEDGE_READ)
  async listFollows(
    @CurrentOrg() org: OrgContext,
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<unknown> {
    const take = Math.min(parseInt(limit ?? '50', 10) || 50, 100)
    const skip = parseInt(offset ?? '0', 10) || 0
    return this.queryBus.execute(new ListFollowsQuery(org.orgId, user.sub, take, skip))
  }
}
