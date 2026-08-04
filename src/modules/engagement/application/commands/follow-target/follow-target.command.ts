import { ICommand } from '@distributed-social-platform/shared-kernel'
import type { FollowTargetType } from '@/modules/engagement/domain/entities/follow.entity'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// natural-key + unique-constraint: Follow @@unique(userId, targetType, targetId) makes a repeat
// a no-op and rejects a concurrent duplicate. Same index serves both axes.
export class FollowTargetCommand implements ICommand {
  readonly name = FollowTargetCommand.name

  constructor(
    readonly userId: string,
    readonly targetType: FollowTargetType,
    readonly targetId: string,
  ) {}
}
