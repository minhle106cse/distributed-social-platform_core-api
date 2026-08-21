import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { Space } from '@/modules/tenant/domain/entities/space.entity'
import { CreateSpaceCommand } from './create-space.command'

@Injectable()
@CommandHandler(CreateSpaceCommand)
export class CreateSpaceHandler implements ITransactionalCommandHandler<
  CreateSpaceCommand,
  string,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: CreateSpaceCommand, tx: CoreApiRepos): Promise<string> {
    const space = Space.create({
      orgId: command.orgId,
      name: command.spaceName,
      visibility: command.visibility,
    })

    await tx.spaces.save(space)

    return space.id
  }
}
