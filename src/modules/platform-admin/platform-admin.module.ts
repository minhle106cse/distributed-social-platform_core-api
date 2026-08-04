import { Module, OnModuleInit } from '@nestjs/common'
import { CommandBus } from '@distributed-social-platform/shared-kernel'
import { SYSTEM_ADMIN_QUERY_REPOSITORY } from './application/queries/system-admin.query-repository'
import { ListAllOrgsHandler } from './application/queries/list-all-orgs/list-all-orgs.handler'
import { ProvisionOrgHandler } from './application/commands/provision-org/provision-org.handler'
import { PrismaSystemAdminQueryRepository } from './infrastructure/repositories/prisma-system-admin.query-repository'
import { PlatformAdminController } from './presentation/controllers/platform-admin.controller'
import { SystemPermissionGuard } from '@/infrastructure/http/guards/system-permission.guard'
import { GrpcModule } from '@/infrastructure/grpc/grpc.module'
import { AuthProvisioningClient } from '@/infrastructure/grpc/auth-provisioning.client'
import { SagaCompensationRegistry } from '@/infrastructure/saga-compensation/saga-compensation.registry'
import { ArchiveOrgCommand } from '@/modules/tenant/application/commands/archive-org/archive-org.command'

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
export class PlatformAdminModule implements OnModuleInit {
  constructor(
    private readonly registry: SagaCompensationRegistry,
    private readonly authProvisioningClient: AuthProvisioningClient,
    private readonly commandBus: CommandBus,
  ) {}

  /**
   * Registers how the SagaCompensationReaperService re-runs each compensation
   * `actionType` `ProvisionOrgHandler` declares — the counterpart to
   * `ctx.onCompensate({ type: '...', payload })` there. Same reasoning as
   * TxScope factory registration: this module owns the runtime dependencies
   * (the gRPC client, the command), so it registers them here rather than the
   * reaper (which lives in generic infra and knows nothing module-specific).
   */
  onModuleInit(): void {
    this.registry.register('cancel-provisioned-user', async (payload) => {
      await this.authProvisioningClient.cancelProvisionedUser(payload.userId as string)
    })
    this.registry.register('archive-org', async (payload) => {
      await this.commandBus.execute(new ArchiveOrgCommand(payload.orgId as string))
    })
  }
}
