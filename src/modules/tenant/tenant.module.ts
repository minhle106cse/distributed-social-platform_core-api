import { Module } from '@nestjs/common'
import { ORGANIZATION_REPOSITORY } from './domain/repositories/organization.repository'
import { MEMBERSHIP_REPOSITORY } from './domain/repositories/membership.repository'
import { SPACE_REPOSITORY } from './domain/repositories/space.repository'
import { ORG_ROLE_PERMISSION_REPOSITORY } from './domain/repositories/org-role-permission.repository'
import type { IOrgRolePermissionRepository } from './domain/repositories/org-role-permission.repository'
import { MEMBERSHIP_QUERY_REPOSITORY } from './application/queries/membership.query-repository'
import { CreateOrgHandler } from './application/commands/create-org/create-org.handler'
import { CreateSpaceHandler } from './application/commands/create-space/create-space.handler'
import { UpdateMemberRoleHandler } from './application/commands/update-member-role/update-member-role.handler'
import { UpdateRolePermissionsHandler } from './application/commands/update-role-permissions/update-role-permissions.handler'
import { CreateInviteHandler } from './application/commands/create-invite/create-invite.handler'
import { AcceptInviteHandler } from './application/commands/accept-invite/accept-invite.handler'
import { GetOrgMembersHandler } from './application/queries/get-org-members/get-org-members.handler'
import { ListMyOrgsHandler } from './application/queries/list-my-orgs/list-my-orgs.handler'
import { GetRolePermissionsHandler } from './application/queries/get-role-permissions/get-role-permissions.handler'
import { CheckMembershipHandler } from './application/queries/check-membership/check-membership.handler'
import { PrismaOrganizationRepository } from './infrastructure/repositories/prisma-organization.repository'
import { PrismaMembershipRepository } from './infrastructure/repositories/prisma-membership.repository'
import { PrismaSpaceRepository } from './infrastructure/repositories/prisma-space.repository'
import { PrismaOrgRolePermissionRepository } from './infrastructure/repositories/prisma-org-role-permission.repository'
import { PrismaMembershipQueryRepository } from './infrastructure/repositories/prisma-membership.query-repository'
import { PrismaOrgInviteRepository } from './infrastructure/repositories/prisma-org-invite.repository'
import { OrgController } from './presentation/controllers/org.controller'
import { OrgGuard } from '@/infrastructure/http/guards/org.guard'
import { ORG_INVITE_REPOSITORY } from './domain/repositories/org-invite.repository'
import { OrgPermissionResolver } from './domain/services/resolve-org-permissions'

@Module({
  controllers: [OrgController],
  exports: [
    OrgGuard,
    OrgPermissionResolver,
    MEMBERSHIP_REPOSITORY,
    ORG_ROLE_PERMISSION_REPOSITORY,
    SPACE_REPOSITORY,
  ],
  providers: [
    OrgGuard,
    {
      provide: OrgPermissionResolver,
      useFactory: (repo: IOrgRolePermissionRepository) => new OrgPermissionResolver(repo),
      inject: [ORG_ROLE_PERMISSION_REPOSITORY],
    },
    // Command handlers
    CreateOrgHandler,
    CreateSpaceHandler,
    UpdateMemberRoleHandler,
    UpdateRolePermissionsHandler,
    CreateInviteHandler,
    AcceptInviteHandler,
    // Query handlers
    GetOrgMembersHandler,
    ListMyOrgsHandler,
    GetRolePermissionsHandler,
    CheckMembershipHandler,
    // Write repositories
    { provide: ORGANIZATION_REPOSITORY, useClass: PrismaOrganizationRepository },
    { provide: MEMBERSHIP_REPOSITORY, useClass: PrismaMembershipRepository },
    { provide: SPACE_REPOSITORY, useClass: PrismaSpaceRepository },
    { provide: ORG_ROLE_PERMISSION_REPOSITORY, useClass: PrismaOrgRolePermissionRepository },
    // Read repositories (Query side)
    { provide: MEMBERSHIP_QUERY_REPOSITORY, useClass: PrismaMembershipQueryRepository },
    { provide: ORG_INVITE_REPOSITORY, useClass: PrismaOrgInviteRepository },
  ],
})
export class TenantModule {}
