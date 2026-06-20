import { Injectable, Inject } from '@nestjs/common'
import type { IQueryHandler } from '@distributed-social-platform/shared-kernel'
import { QueryHandler } from '@/infrastructure/cqrs/decorators/query-handler.decorator'
import { MEMBERSHIP_QUERY_REPOSITORY } from './membership.query-repository'
import type { IMembershipQueryRepository } from './membership.query-repository'
import { GetOrgMembersQuery } from './get-org-members.query'
import type { MemberDto } from './get-org-members.dto'

@Injectable()
@QueryHandler(GetOrgMembersQuery)
export class GetOrgMembersHandler implements IQueryHandler<GetOrgMembersQuery, MemberDto[]> {
  constructor(
    @Inject(MEMBERSHIP_QUERY_REPOSITORY) private readonly queryRepo: IMembershipQueryRepository,
  ) {}

  async execute(query: GetOrgMembersQuery): Promise<MemberDto[]> {
    return this.queryRepo.findMembersByOrgId(query.orgId, query.limit, query.offset)
  }
}
