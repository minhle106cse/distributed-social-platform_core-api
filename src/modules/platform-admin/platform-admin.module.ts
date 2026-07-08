import { Module } from '@nestjs/common'
import { SYSTEM_ADMIN_QUERY_REPOSITORY } from './application/queries/system-admin.query-repository'
import { ListAllOrgsHandler } from './application/queries/list-all-orgs/list-all-orgs.handler'
import { ProvisionOrgHandler } from './application/commands/provision-org/provision-org.handler'
import { PrismaSystemAdminQueryRepository } from './infrastructure/repositories/prisma-system-admin.query-repository'
import { PlatformAdminController } from './presentation/controllers/platform-admin.controller'
import { SystemPermissionGuard } from '@/infrastructure/http/guards/system-permission.guard'
import { GrpcModule } from '@/infrastructure/grpc/grpc.module'

@Module({
  imports: [GrpcModule],
  controllers: [PlatformAdminController],
  providers: [
    SystemPermissionGuard,
    ListAllOrgsHandler,
    ProvisionOrgHandler,
    { provide: SYSTEM_ADMIN_QUERY_REPOSITORY, useClass: PrismaSystemAdminQueryRepository },
  ],
})
export class PlatformAdminModule {}
