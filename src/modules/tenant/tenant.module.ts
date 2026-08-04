import { Module } from '@nestjs/common'
import { ORG_ROLE_PERMISSION_READER } from './domain/repositories/org-role-permission.repository'
import type { IOrgRolePermissionReader } from './domain/repositories/org-role-permission.repository'
import { MEMBERSHIP_QUERY_REPOSITORY } from './application/queries/membership.query-repository'
import { CreateOrgHandler } from './application/commands/create-org/create-org.handler'
import { ArchiveOrgHandler } from './application/commands/archive-org/archive-org.handler'
import { CreateSpaceHandler } from './application/commands/create-space/create-space.handler'
import { UpdateMemberRoleHandler } from './application/commands/update-member-role/update-member-role.handler'
import { UpdateRolePermissionsHandler } from './application/commands/update-role-permissions/update-role-permissions.handler'
import { CreateInviteHandler } from './application/commands/create-invite/create-invite.handler'
import { AcceptInviteHandler } from './application/commands/accept-invite/accept-invite.handler'
import { GetOrgMembersHandler } from './application/queries/get-org-members/get-org-members.handler'
import { ListMyOrgsHandler } from './application/queries/list-my-orgs/list-my-orgs.handler'
import { GetRolePermissionsHandler } from './application/queries/get-role-permissions/get-role-permissions.handler'
import { CheckMembershipHandler } from './application/queries/check-membership/check-membership.handler'
import { PrismaMembershipQueryRepository } from './infrastructure/repositories/prisma-membership.query-repository'
import { PrismaOrgRolePermissionQueryRepository } from './infrastructure/repositories/prisma-org-role-permission.query-repository'
import { OrgController } from './presentation/controllers/org.controller'
import { OrgGuard } from '@/infrastructure/http/guards/org.guard'
import { OrgPermissionResolver } from './domain/services/resolve-org-permissions'

@Module({
  controllers: [OrgController],
  exports: [OrgGuard, OrgPermissionResolver, MEMBERSHIP_QUERY_REPOSITORY],
  providers: [
    OrgGuard,
    {
      // Resolves permissions for a guard, i.e. before any transaction exists —
      // so it takes the READER, not the write repository (ADR-0001).
      provide: OrgPermissionResolver,
      useFactory: (reader: IOrgRolePermissionReader) => new OrgPermissionResolver(reader),
      inject: [ORG_ROLE_PERMISSION_READER],
    },
    // Command handlers
    CreateOrgHandler,
    ArchiveOrgHandler,
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
    // Read repositories (query side) — plain client, no transaction
    { provide: MEMBERSHIP_QUERY_REPOSITORY, useClass: PrismaMembershipQueryRepository },
    { provide: ORG_ROLE_PERMISSION_READER, useClass: PrismaOrgRolePermissionQueryRepository },
  ],
})
export class TenantModule {}
