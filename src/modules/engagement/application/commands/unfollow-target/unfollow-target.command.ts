import { ICommand } from '@distributed-social-platform/shared-kernel'
import type { FollowTargetType } from '@/modules/engagement/domain/entities/follow.entity'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// natural-key: delete by (userId, targetType, targetId) — a repeat is a no-op.
// none: a delete has no duplicate-creation race to guard.
export class UnfollowTargetCommand implements ICommand {
  readonly name = UnfollowTargetCommand.name

  constructor(
    readonly userId: string,
    readonly targetType: FollowTargetType,
    readonly targetId: string,
  ) {}
}
