import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'
import type { FollowTargetType } from '@/modules/engagement/domain/entities/follow.entity'

export class UnfollowTargetCommand implements ICommand {
  readonly name = UnfollowTargetCommand.name
  readonly options: CommandOptions = {
    transactional: true,
    // natural-key: delete by (userId, targetType, targetId) — a repeat is a no-op.
    // none: a delete has no duplicate-creation race to guard.
  }

  constructor(
    readonly userId: string,
    readonly targetType: FollowTargetType,
    readonly targetId: string,
  ) {}
}
