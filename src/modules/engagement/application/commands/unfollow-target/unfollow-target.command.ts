import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'
import type { FollowTargetType } from '@/modules/engagement/domain/entities/follow.entity'

export class UnfollowTargetCommand implements ICommand {
  readonly name = 'UnfollowTargetCommand'
  readonly options: CommandOptions = { transactional: false, retryable: false }

  constructor(
    readonly userId: string,
    readonly targetType: FollowTargetType,
    readonly targetId: string,
  ) {}
}
