import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'
import type { FollowTargetType } from '@/modules/engagement/domain/entities/follow.entity'

export class FollowTargetCommand implements ICommand {
  readonly name = FollowTargetCommand.name
  readonly options: CommandOptions = {
    transactional: true,
    // natural-key + unique-constraint: Follow @@unique(userId, targetType, targetId) makes a repeat
    // a no-op and rejects a concurrent duplicate. Same index serves both axes.
  }

  constructor(
    readonly userId: string,
    readonly targetType: FollowTargetType,
    readonly targetId: string,
  ) {}
}
