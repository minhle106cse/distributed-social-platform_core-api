import { Injectable, Inject } from '@nestjs/common'
import type { IQueryHandler } from '@distributed-social-platform/shared-kernel'
import { QueryHandler } from '@/infrastructure/cqrs/decorators/query-handler.decorator'
import { SYSTEM_ADMIN_QUERY_REPOSITORY } from '../system-admin.query-repository'
import type { ISystemAdminQueryRepository } from '../system-admin.query-repository'
import type { OrgSummaryDto } from '../system-admin.dto'
import { ListAllOrgsQuery } from './list-all-orgs.query'

@Injectable()
@QueryHandler(ListAllOrgsQuery)
export class ListAllOrgsHandler implements IQueryHandler<ListAllOrgsQuery, OrgSummaryDto[]> {
  constructor(
    @Inject(SYSTEM_ADMIN_QUERY_REPOSITORY)
    private readonly queryRepo: ISystemAdminQueryRepository,
  ) {}

  async execute(query: ListAllOrgsQuery): Promise<OrgSummaryDto[]> {
    return this.queryRepo.listAllOrgs(query.limit, query.offset)
  }
}
