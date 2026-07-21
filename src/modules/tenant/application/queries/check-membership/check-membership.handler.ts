import { Injectable, Inject } from '@nestjs/common'
import type { IQueryHandler } from '@distributed-social-platform/shared-kernel'
import { QueryHandler } from '@/infrastructure/cqrs/decorators/query-handler.decorator'
import { MEMBERSHIP_REPOSITORY } from '@/modules/tenant/domain/repositories/membership.repository'
import type { IMembershipRepository } from '@/modules/tenant/domain/repositories/membership.repository'
import { OrgPermissionResolver } from '@/modules/tenant/domain/services/resolve-org-permissions'
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
    @Inject(MEMBERSHIP_REPOSITORY) private readonly membershipRepo: IMembershipRepository,
    private readonly permissionResolver: OrgPermissionResolver,
  ) {}

  async execute(query: CheckMembershipQuery): Promise<CheckMembershipResult> {
    const membership = await this.membershipRepo.findByOrgAndUser(query.orgId, query.userId)
    if (!membership) return { isMember: false, permissions: [] }

    const permissions = await this.permissionResolver.resolve(query.orgId, membership.role)
    return { isMember: true, permissions }
  }
}
