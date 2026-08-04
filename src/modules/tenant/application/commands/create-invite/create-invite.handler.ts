import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/infrastructure/database/prisma/core-api-repos.factory'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { OrgInvite } from '@/modules/tenant/domain/entities/org-invite.entity'
import { CreateInviteCommand } from './create-invite.command'

@Injectable()
@CommandHandler(CreateInviteCommand)
export class CreateInviteHandler implements ITransactionalCommandHandler<
  CreateInviteCommand,
  string,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: CreateInviteCommand, tx: CoreApiRepos): Promise<string> {
    const invite = OrgInvite.create({
      token: command.token,
      orgId: command.orgId,
      role: command.role,
      createdBy: command.createdBy,
      expiresAt: command.expiresAt,
    })

    await tx.invites.save(invite)
    return invite.token
  }
}
