import { Injectable } from '@nestjs/common'
import { CommandBus, type ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { AuthProvisioningClient } from '@/infrastructure/grpc/auth-provisioning.client'
import { CreateOrgCommand } from '@/modules/tenant/application/commands/create-org/create-org.command'
import { ProvisionOrgCommand } from './provision-org.command'

export interface ProvisionOrgResult {
  orgId: string
  ownerUserId: string
  temporaryPassword: string
}

@Injectable()
@CommandHandler(ProvisionOrgCommand)
export class ProvisionOrgHandler implements ICommandHandler<
  ProvisionOrgCommand,
  ProvisionOrgResult
> {
  constructor(
    private readonly authProvisioningClient: AuthProvisioningClient,
    private readonly commandBus: CommandBus,
    @InjectPinoLogger(ProvisionOrgHandler.name) private readonly logger: PinoLogger,
  ) {}

  async execute(command: ProvisionOrgCommand): Promise<ProvisionOrgResult> {
    // Step 1: provision the owner in auth-service (separate DB/service).
    const { userId, temporaryPassword } = await this.authProvisioningClient.provisionUser(
      command.ownerEmail,
    )

    // Step 2: create the org + OWNER membership locally. Reuses CreateOrgHandler
    // as-is — it doesn't care whether ownerUserId is the caller or a freshly
    // provisioned user.
    try {
      const orgId = await this.commandBus.execute<CreateOrgCommand, string>(
        new CreateOrgCommand(command.orgName, command.slug, userId),
      )
      return { orgId, ownerUserId: userId, temporaryPassword }
    } catch (err) {
      // Compensate: undo step 1. Best-effort — a secondary failure here must
      // not mask the original error the System Admin needs to see (e.g. slug
      // taken); a stray unverified user is a harmless orphan, cleanable later.
      try {
        await this.authProvisioningClient.cancelProvisionedUser(userId)
      } catch (compensationErr) {
        this.logger.error(
          { userId, compensationErr },
          'Failed to compensate (cancel provisioned user) after org creation failure — manual cleanup needed',
        )
      }
      throw err
    }
  }
}
