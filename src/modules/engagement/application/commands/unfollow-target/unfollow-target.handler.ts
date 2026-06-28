import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { FOLLOW_REPOSITORY } from '@/modules/engagement/domain/repositories/follow.repository'
import type { IFollowRepository } from '@/modules/engagement/domain/repositories/follow.repository'
import { UnfollowTargetCommand } from './unfollow-target.command'

@Injectable()
@CommandHandler(UnfollowTargetCommand)
export class UnfollowTargetHandler implements ICommandHandler<UnfollowTargetCommand, void> {
  constructor(@Inject(FOLLOW_REPOSITORY) private readonly followRepo: IFollowRepository) {}

  async execute(command: UnfollowTargetCommand): Promise<void> {
    await this.followRepo.remove(command.userId, command.targetType, command.targetId)
  }
}
