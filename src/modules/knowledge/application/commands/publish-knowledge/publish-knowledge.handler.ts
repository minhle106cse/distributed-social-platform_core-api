import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import { KnowledgePublishedEvent } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import {
  KnowledgeItemNotFoundError,
  InvalidKnowledgeStateError,
} from '@/common/errors/knowledge.error'
import { PublishKnowledgeCommand } from './publish-knowledge.command'

@Injectable()
@CommandHandler(PublishKnowledgeCommand)
export class PublishKnowledgeHandler implements ITransactionalCommandHandler<
  PublishKnowledgeCommand,
  void,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: PublishKnowledgeCommand, tx: CoreApiRepos): Promise<void> {
    const item = await tx.items.findById(command.id)
    if (!item) throw new KnowledgeItemNotFoundError()

    if (item.status !== 'DRAFT') {
      throw new InvalidKnowledgeStateError('Only DRAFT items can be published')
    }

    item.publish()
    await tx.items.update(item)

    await tx.outbox.append(
      KnowledgePublishedEvent.create({
        aggregateId: item.id,
        orgId: item.orgId,
        payload: {
          itemId: item.id,
          spaceId: item.spaceId,
          type: item.type,
          title: item.title,
          body: item.body,
          createdByUserId: item.createdByUserId,
        },
      }),
    )
  }
}
