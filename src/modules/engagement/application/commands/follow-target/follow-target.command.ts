import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'
import type { FollowTargetType } from '@/modules/engagement/domain/entities/follow.entity'

export class FollowTargetCommand implements ICommand {
  readonly name = 'FollowTargetCommand'
  readonly options: CommandOptions = { transactional: true, retryable: false }

  constructor(
    readonly userId: string,
    readonly targetType: FollowTargetType,
    readonly targetId: string,
  ) {}
}
