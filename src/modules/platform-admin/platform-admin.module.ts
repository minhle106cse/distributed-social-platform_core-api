import { Inject, Module, OnModuleInit } from '@nestjs/common'
import { CommandBus } from '@distributed-social-platform/shared-kernel'
import { SYSTEM_ADMIN_QUERY_REPOSITORY } from './application/repositories/system-admin.query-repository'
import { ListAllOrgsHandler } from './application/queries/list-all-orgs/list-all-orgs.handler'
import { ProvisionOrgHandler } from './application/commands/provision-org/provision-org.handler'
import { PrismaSystemAdminQueryRepository } from './infrastructure/repositories/prisma-system-admin.query-repository'
import { PlatformAdminController } from './presentation/controllers/platform-admin.controller'
import { SystemPermissionGuard } from '@/infrastructure/http/guards/system-permission.guard'
import {
  AUTH_PROVISIONING_SERVICE,
  type IAuthProvisioningService,
} from './domain/services/auth-provisioning.service'
import { SagaCompensationRegistry } from '@/infrastructure/saga-compensation/saga-compensation.registry'
import { ArchiveOrgCommand } from '@/modules/tenant/application/commands/archive-org/archive-org.command'

@Module({
  // AUTH_PROVISIONING_SERVICE comes from GrpcModule (@Global, imported once by
  // AppModule) — see that module's doc for why it is not imported per-consumer.
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
    @Inject(AUTH_PROVISIONING_SERVICE)
    private readonly authProvisioning: IAuthProvisioningService,
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
      await this.authProvisioning.cancelProvisionedUser(payload.userId as string)
    })
    this.registry.register('archive-org', async (payload) => {
      await this.commandBus.execute(new ArchiveOrgCommand(payload.orgId as string))
    })
  }
}
