import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { Space } from '@/modules/tenant/domain/entities/space.entity'
import { SPACE_REPOSITORY } from '@/modules/tenant/domain/repositories/space.repository'
import type { ISpaceRepository } from '@/modules/tenant/domain/repositories/space.repository'
import { CreateSpaceCommand } from './create-space.command'

@Injectable()
@CommandHandler(CreateSpaceCommand)
export class CreateSpaceHandler implements ICommandHandler<CreateSpaceCommand, string> {
  constructor(@Inject(SPACE_REPOSITORY) private readonly spaceRepo: ISpaceRepository) {}

  async execute(command: CreateSpaceCommand): Promise<string> {
    const space = Space.create({
      orgId: command.orgId,
      name: command.spaceName,
      visibility: command.visibility,
    })

    await this.spaceRepo.save(space)

    return space.id
  }
}
