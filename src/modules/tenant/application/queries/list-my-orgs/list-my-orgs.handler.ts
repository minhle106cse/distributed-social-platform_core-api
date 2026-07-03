import { Injectable, Inject } from '@nestjs/common'
import type { IQueryHandler } from '@distributed-social-platform/shared-kernel'
import { QueryHandler } from '@/infrastructure/cqrs/decorators/query-handler.decorator'
import { MEMBERSHIP_QUERY_REPOSITORY } from '../get-org-members/membership.query-repository'
import type { IMembershipQueryRepository } from '../get-org-members/membership.query-repository'
import { ListMyOrgsQuery } from './list-my-orgs.query'
import type { MyOrgDto } from './list-my-orgs.dto'

/**
 * Bootstrap query: which orgs does the caller belong to? Deliberately NOT
 * OrgGuard-protected — the client calls this right after login precisely to
 * discover an orgId for the X-Org-Id header. Tenant-safe by construction: it
 * only ever returns rows where membership.userId = the JWT subject.
 */
@Injectable()
@QueryHandler(ListMyOrgsQuery)
export class ListMyOrgsHandler implements IQueryHandler<ListMyOrgsQuery, MyOrgDto[]> {
  constructor(
    @Inject(MEMBERSHIP_QUERY_REPOSITORY) private readonly queryRepo: IMembershipQueryRepository,
  ) {}

  async execute(query: ListMyOrgsQuery): Promise<MyOrgDto[]> {
    return this.queryRepo.findOrgsByUserId(query.userId)
  }
}
