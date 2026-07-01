import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { FollowCreatedEvent } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { Follow } from '@/modules/engagement/domain/entities/follow.entity'
import { KNOWLEDGE_ITEM_REPOSITORY } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import { SPACE_REPOSITORY } from '@/modules/tenant/domain/repositories/space.repository'
import type { ISpaceRepository } from '@/modules/tenant/domain/repositories/space.repository'
import { FOLLOW_REPOSITORY } from '@/modules/engagement/domain/repositories/follow.repository'
import type { IFollowRepository } from '@/modules/engagement/domain/repositories/follow.repository'
import { OUTBOX_REPOSITORY } from '@/modules/outbox/domain/repositories/outbox.repository'
import type { IOutboxRepository } from '@/modules/outbox/domain/repositories/outbox.repository'
import { requireTenantId } from '@/common/tenant/tenant.context'
import { FollowTargetNotFoundError } from '@/common/errors/engagement.error'
import { FollowTargetCommand } from './follow-target.command'

@Injectable()
@CommandHandler(FollowTargetCommand)
export class FollowTargetHandler implements ICommandHandler<FollowTargetCommand, void> {
  constructor(
    @Inject(KNOWLEDGE_ITEM_REPOSITORY) private readonly itemRepo: IKnowledgeItemRepository,
    @Inject(SPACE_REPOSITORY) private readonly spaceRepo: ISpaceRepository,
    @Inject(FOLLOW_REPOSITORY) private readonly followRepo: IFollowRepository,
    @Inject(OUTBOX_REPOSITORY) private readonly outboxRepo: IOutboxRepository,
  ) {}

  async execute(command: FollowTargetCommand): Promise<void> {
    const orgId = requireTenantId()

    if (command.targetType === 'DOCUMENT') {
      const item = await this.itemRepo.findById(command.targetId)
      if (!item) throw new FollowTargetNotFoundError()
    } else {
      const space = await this.spaceRepo.findById(command.targetId)
      if (!space) throw new FollowTargetNotFoundError()
    }

    const follow = Follow.create({
      orgId,
      userId: command.userId,
      targetType: command.targetType,
      targetId: command.targetId,
    })
    await this.followRepo.add(follow)

    await this.outboxRepo.append(
      FollowCreatedEvent.create({
        aggregateId: follow.id,
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
