import { Injectable, Inject } from '@nestjs/common'
import type { IQueryHandler } from '@distributed-social-platform/shared-kernel'
import { QueryHandler } from '@/infrastructure/cqrs/decorators/query-handler.decorator'
import { ENGAGEMENT_QUERY_REPOSITORY } from '../../repositories/engagement.query-repository'
import type { IEngagementQueryRepository } from '../../repositories/engagement.query-repository'
import type { VoteSummaryDto } from '../engagement.dto'
import { GetVoteSummaryQuery } from './get-vote-summary.query'

@Injectable()
@QueryHandler(GetVoteSummaryQuery)
export class GetVoteSummaryHandler implements IQueryHandler<GetVoteSummaryQuery, VoteSummaryDto> {
  constructor(
    @Inject(ENGAGEMENT_QUERY_REPOSITORY) private readonly queryRepo: IEngagementQueryRepository,
  ) {}

  async execute(query: GetVoteSummaryQuery): Promise<VoteSummaryDto> {
    return this.queryRepo.getVoteSummary(query.itemId, query.orgId, query.userId)
  }
}
