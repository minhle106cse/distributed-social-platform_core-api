import { Module } from '@nestjs/common'
import { TenantModule } from '@/modules/tenant/tenant.module'
import { FEED_QUERY_REPOSITORY } from './application/repositories/feed.query-repository'
import { GetFeedHandler } from './application/queries/get-feed/get-feed.handler'
import { PrismaFeedQueryRepository } from './infrastructure/repositories/prisma-feed.query-repository'
import { FeedController } from './presentation/controllers/feed.controller'

@Module({
  imports: [TenantModule],
  controllers: [FeedController],
  providers: [
    GetFeedHandler,
    { provide: FEED_QUERY_REPOSITORY, useClass: PrismaFeedQueryRepository },
  ],
})
export class FeedModule {}
