import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import { FollowRemovedEvent } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { Follow } from '@/modules/engagement/domain/entities/follow.entity'
import { requireTenantId } from '@/common/tenant/tenant.context'
import { UnfollowTargetCommand } from './unfollow-target.command'

@Injectable()
@CommandHandler(UnfollowTargetCommand)
export class UnfollowTargetHandler implements ITransactionalCommandHandler<
  UnfollowTargetCommand,
  void,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: UnfollowTargetCommand, tx: CoreApiRepos): Promise<void> {
    const orgId = requireTenantId()

    await tx.follows.remove(command.userId, command.targetType, command.targetId)

    await tx.outbox.append(
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
