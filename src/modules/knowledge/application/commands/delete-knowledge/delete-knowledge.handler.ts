import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { KNOWLEDGE_ITEM_REPOSITORY } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import { KnowledgeItemNotFoundError } from '@/common/errors/knowledge.error'
import { DeleteKnowledgeCommand } from './delete-knowledge.command'

@Injectable()
@CommandHandler(DeleteKnowledgeCommand)
export class DeleteKnowledgeHandler implements ICommandHandler<DeleteKnowledgeCommand, void> {
  constructor(
    @Inject(KNOWLEDGE_ITEM_REPOSITORY) private readonly itemRepo: IKnowledgeItemRepository,
  ) {}

  async execute(command: DeleteKnowledgeCommand): Promise<void> {
    const item = await this.itemRepo.findById(command.id)
    if (!item) throw new KnowledgeItemNotFoundError()

    item.softDelete()
    await this.itemRepo.update(item)
  }
}
