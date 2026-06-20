import { Module } from '@nestjs/common'
import { ORGANIZATION_REPOSITORY } from './domain/repositories/organization.repository'
import { MEMBERSHIP_REPOSITORY } from './domain/repositories/membership.repository'
import { SPACE_REPOSITORY } from './domain/repositories/space.repository'
import { MEMBERSHIP_QUERY_REPOSITORY } from './application/queries/get-org-members/membership.query-repository'
import { CreateOrgHandler } from './application/commands/create-org/create-org.handler'
import { CreateSpaceHandler } from './application/commands/create-space/create-space.handler'
import { UpdateMemberRoleHandler } from './application/commands/update-member-role/update-member-role.handler'
import { GetOrgMembersHandler } from './application/queries/get-org-members/get-org-members.handler'
import { PrismaOrganizationRepository } from './infrastructure/repositories/prisma-organization.repository'
import { PrismaMembershipRepository } from './infrastructure/repositories/prisma-membership.repository'
import { PrismaSpaceRepository } from './infrastructure/repositories/prisma-space.repository'
import { PrismaMembershipQueryRepository } from './infrastructure/repositories/prisma-membership.query-repository'
import { OrgController } from './presentation/controllers/org.controller'

@Module({
  controllers: [OrgController],
  providers: [
    // Command handlers
    CreateOrgHandler,
    CreateSpaceHandler,
    UpdateMemberRoleHandler,
    // Query handlers
    GetOrgMembersHandler,
    // Write repositories
    { provide: ORGANIZATION_REPOSITORY, useClass: PrismaOrganizationRepository },
    { provide: MEMBERSHIP_REPOSITORY, useClass: PrismaMembershipRepository },
    { provide: SPACE_REPOSITORY, useClass: PrismaSpaceRepository },
    // Read repositories (Query side)
    { provide: MEMBERSHIP_QUERY_REPOSITORY, useClass: PrismaMembershipQueryRepository },
  ],
})
export class TenantModule {}
