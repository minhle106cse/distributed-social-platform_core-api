import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { OrgInvite } from '@/modules/tenant/domain/entities/org-invite.entity'
import { ORG_INVITE_REPOSITORY } from '@/modules/tenant/domain/repositories/org-invite.repository'
import type { IOrgInviteRepository } from '@/modules/tenant/domain/repositories/org-invite.repository'
import { CreateInviteCommand } from './create-invite.command'

@Injectable()
@CommandHandler(CreateInviteCommand)
export class CreateInviteHandler implements ICommandHandler<CreateInviteCommand, string> {
  constructor(
    @Inject(ORG_INVITE_REPOSITORY) private readonly inviteRepo: IOrgInviteRepository,
  ) {}

  async execute(command: CreateInviteCommand): Promise<string> {
    const invite = OrgInvite.create({
      id: command.inviteId,
      token: command.token,
      orgId: command.orgId,
      role: command.role,
      createdBy: command.createdBy,
      expiresAt: command.expiresAt,
    })

    await this.inviteRepo.save(invite)
    return invite.token
  }
}
