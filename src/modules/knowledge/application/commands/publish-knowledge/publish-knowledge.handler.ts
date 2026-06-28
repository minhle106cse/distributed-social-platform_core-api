import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { KNOWLEDGE_ITEM_REPOSITORY } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import {
  KnowledgeItemNotFoundError,
  InvalidKnowledgeStateError,
} from '@/common/errors/knowledge.error'
import { PublishKnowledgeCommand } from './publish-knowledge.command'

@Injectable()
@CommandHandler(PublishKnowledgeCommand)
export class PublishKnowledgeHandler implements ICommandHandler<PublishKnowledgeCommand, void> {
  constructor(
    @Inject(KNOWLEDGE_ITEM_REPOSITORY) private readonly itemRepo: IKnowledgeItemRepository,
  ) {}

  async execute(command: PublishKnowledgeCommand): Promise<void> {
    const item = await this.itemRepo.findById(command.id)
    if (!item) throw new KnowledgeItemNotFoundError()

    if (item.status !== 'DRAFT') {
      throw new InvalidKnowledgeStateError('Only DRAFT items can be published')
    }

    item.publish()
    await this.itemRepo.update(item)
  }
}
