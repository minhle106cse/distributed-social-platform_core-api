import { Module } from '@nestjs/common'
import { TenantModule } from '@/modules/tenant/tenant.module'
import { KnowledgeModule } from '@/modules/knowledge/knowledge.module'
import { VOTE_REPOSITORY } from './domain/repositories/vote.repository'
import { BOOKMARK_REPOSITORY } from './domain/repositories/bookmark.repository'
import { FOLLOW_REPOSITORY } from './domain/repositories/follow.repository'
import { ENGAGEMENT_QUERY_REPOSITORY } from './application/queries/engagement.query-repository'
import { CastVoteHandler } from './application/commands/cast-vote/cast-vote.handler'
import { RemoveVoteHandler } from './application/commands/remove-vote/remove-vote.handler'
import { AddBookmarkHandler } from './application/commands/add-bookmark/add-bookmark.handler'
import { RemoveBookmarkHandler } from './application/commands/remove-bookmark/remove-bookmark.handler'
import { AcceptAnswerHandler } from './application/commands/accept-answer/accept-answer.handler'
import { UnacceptAnswerHandler } from './application/commands/unaccept-answer/unaccept-answer.handler'
import { FollowTargetHandler } from './application/commands/follow-target/follow-target.handler'
import { UnfollowTargetHandler } from './application/commands/unfollow-target/unfollow-target.handler'
import { GetVoteSummaryHandler } from './application/queries/get-vote-summary/get-vote-summary.handler'
import { ListBookmarksHandler } from './application/queries/list-bookmarks/list-bookmarks.handler'
import { ListFollowsHandler } from './application/queries/list-follows/list-follows.handler'
import { PrismaVoteRepository } from './infrastructure/repositories/prisma-vote.repository'
import { PrismaBookmarkRepository } from './infrastructure/repositories/prisma-bookmark.repository'
import { PrismaFollowRepository } from './infrastructure/repositories/prisma-follow.repository'
import { PrismaEngagementQueryRepository } from './infrastructure/repositories/prisma-engagement.query-repository'
import { EngagementController } from './presentation/controllers/engagement.controller'

@Module({
  imports: [TenantModule, KnowledgeModule],
  controllers: [EngagementController],
  providers: [
    // Command handlers
    CastVoteHandler,
    RemoveVoteHandler,
    AddBookmarkHandler,
    RemoveBookmarkHandler,
    AcceptAnswerHandler,
    UnacceptAnswerHandler,
    FollowTargetHandler,
    UnfollowTargetHandler,
    // Query handlers
    GetVoteSummaryHandler,
    ListBookmarksHandler,
    ListFollowsHandler,
    // Write repositories
    { provide: VOTE_REPOSITORY, useClass: PrismaVoteRepository },
    { provide: BOOKMARK_REPOSITORY, useClass: PrismaBookmarkRepository },
    { provide: FOLLOW_REPOSITORY, useClass: PrismaFollowRepository },
    // Read repository (query side)
    { provide: ENGAGEMENT_QUERY_REPOSITORY, useClass: PrismaEngagementQueryRepository },
  ],
})
export class EngagementModule {}
