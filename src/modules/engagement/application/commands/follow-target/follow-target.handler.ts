import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import { FollowCreatedEvent } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { Follow } from '@/modules/engagement/domain/entities/follow.entity'
import { requireTenantId } from '@/common/tenant/tenant.context'
import { FollowTargetNotFoundError } from '@/modules/engagement/domain/engagement.error'
import { FollowTargetCommand } from './follow-target.command'

@Injectable()
@CommandHandler(FollowTargetCommand)
export class FollowTargetHandler implements ITransactionalCommandHandler<
  FollowTargetCommand,
  void,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: FollowTargetCommand, tx: CoreApiRepos): Promise<void> {
    const orgId = requireTenantId()

    if (command.targetType === 'DOCUMENT') {
      const item = await tx.items.findById(command.targetId)
      if (!item) throw new FollowTargetNotFoundError()
    } else {
      const space = await tx.spaces.findById(command.targetId)
      if (!space) throw new FollowTargetNotFoundError()
    }

    const follow = Follow.create({
      orgId,
      userId: command.userId,
      targetType: command.targetType,
      targetId: command.targetId,
    })
    await tx.follows.add(follow)

    await tx.outbox.append(
      FollowCreatedEvent.create({
        // Partition key = follow relationship identity (NOT follow.id) so this
        // event stays ordered with its FollowRemoved counterpart. See Follow.streamKey.
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
