import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { FollowRemovedEvent } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { FOLLOW_REPOSITORY } from '@/modules/engagement/domain/repositories/follow.repository'
import type { IFollowRepository } from '@/modules/engagement/domain/repositories/follow.repository'
import { OUTBOX_REPOSITORY } from '@/modules/outbox/domain/repositories/outbox.repository'
import type { IOutboxRepository } from '@/modules/outbox/domain/repositories/outbox.repository'
import { requireTenantId } from '@/common/tenant/tenant.context'
import { UnfollowTargetCommand } from './unfollow-target.command'

@Injectable()
@CommandHandler(UnfollowTargetCommand)
export class UnfollowTargetHandler implements ICommandHandler<UnfollowTargetCommand, void> {
  constructor(
    @Inject(FOLLOW_REPOSITORY) private readonly followRepo: IFollowRepository,
    @Inject(OUTBOX_REPOSITORY) private readonly outboxRepo: IOutboxRepository,
  ) {}

  async execute(command: UnfollowTargetCommand): Promise<void> {
    const orgId = requireTenantId()

    await this.followRepo.remove(command.userId, command.targetType, command.targetId)

    await this.outboxRepo.append(
      FollowRemovedEvent.create({
        aggregateId: command.targetId,
        orgId,
        payload: {
          orgId,
          userId: command.userId,
          targetType: command.targetType,
          targetId: command.targetId,
        },
      }),
    )
  }
}
