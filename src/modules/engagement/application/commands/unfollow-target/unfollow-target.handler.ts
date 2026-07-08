import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { FollowRemovedEvent } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { Follow } from '@/modules/engagement/domain/entities/follow.entity'
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
        // Same partition key as FollowCreated (relationship identity) so unfollow
        // never reorders ahead of its follow on the consumer. See Follow.streamKey.
        aggregateId: Follow.streamKey(command.userId, command.targetType, command.targetId),
        orgId,
        payload: {
          userId: command.userId,
          targetType: command.targetType,
          targetId: command.targetId,
        },
      }),
    )
  }
}
