import { Injectable, Inject } from '@nestjs/common'
import type { IQueryHandler } from '@distributed-social-platform/shared-kernel'
import { QueryHandler } from '@/infrastructure/cqrs/decorators/query-handler.decorator'
import { MEMBERSHIP_QUERY_REPOSITORY } from '@/modules/tenant/application/repositories/membership.query-repository'
import type { IMembershipQueryRepository } from '@/modules/tenant/application/repositories/membership.query-repository'
import { OrgPermissionResolver } from '@/modules/tenant/domain/services/org-permission-resolver'
import { CheckMembershipQuery } from './check-membership.query'

export interface CheckMembershipResult {
  isMember: boolean
  permissions: string[]
}

// Same read core-api's own OrgGuard performs for local HTTP requests, exposed
// through QueryBus so the gRPC entry point (MembershipVerificationGrpcService,
// consumed by search-service/notification-service) goes through the same CQRS
// pipeline every other read in this module uses — matches auth-service's
// AuthProvisioningGrpcService delegating to CommandBus instead of reaching
// into a repository directly.
@Injectable()
@QueryHandler(CheckMembershipQuery)
export class CheckMembershipHandler implements IQueryHandler<
  CheckMembershipQuery,
  CheckMembershipResult
> {
  constructor(
    @Inject(MEMBERSHIP_QUERY_REPOSITORY)
    private readonly membershipQueryRepo: IMembershipQueryRepository,
    private readonly permissionResolver: OrgPermissionResolver,
  ) {}

  async execute(query: CheckMembershipQuery): Promise<CheckMembershipResult> {
    const role = await this.membershipQueryRepo.findRoleByOrgAndUser(query.orgId, query.userId)
    if (!role) return { isMember: false, permissions: [] }

    const permissions = await this.permissionResolver.resolve(query.orgId, role)
    return { isMember: true, permissions }
  }
}
