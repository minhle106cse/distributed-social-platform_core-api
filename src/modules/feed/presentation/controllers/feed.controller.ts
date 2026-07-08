import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { QueryBus } from '@distributed-social-platform/shared-kernel'
import { JwtAuthGuard } from '@/infrastructure/http/guards/jwt-auth.guard'
import type { JwtPayload } from '@/infrastructure/http/guards/jwt-auth.guard'
import { OrgGuard } from '@/infrastructure/http/guards/org.guard'
import type { OrgContext } from '@/infrastructure/http/types/org-context.interface'
import { RequireOrgPermission } from '@/infrastructure/http/decorators/require-org-permission.decorator'
import { OrgPermission } from '@/modules/tenant/domain/org-rbac'
import { CurrentUser } from '@/infrastructure/http/decorators/current-user.decorator'
import { CurrentOrg } from '@/infrastructure/http/decorators/current-org.decorator'
import { ZodValidationPipe } from '@/infrastructure/http/pipes/zod-validation.pipe'
import { GetFeedQuery } from '../../application/queries/get-feed/get-feed.query'
import { GetFeedSchema } from '../schemas/get-feed.schema'
import type { GetFeedDto } from '../schemas/get-feed.schema'

@Controller()
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('feed')
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.KNOWLEDGE_READ)
  async getFeed(
    @Query(new ZodValidationPipe(GetFeedSchema)) q: GetFeedDto,
    @CurrentUser() user: JwtPayload,
    @CurrentOrg() org: OrgContext,
  ): Promise<unknown> {
    return this.queryBus.execute(new GetFeedQuery(org.orgId, user.sub, q.limit, q.offset))
  }
}
