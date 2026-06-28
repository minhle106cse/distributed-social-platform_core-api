import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { KnowledgeItem } from '@/modules/knowledge/domain/entities/knowledge-item.entity'
import { KNOWLEDGE_ITEM_REPOSITORY } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import { CreateKnowledgeCommand } from './create-knowledge.command'

@Injectable()
@CommandHandler(CreateKnowledgeCommand)
export class CreateKnowledgeHandler implements ICommandHandler<CreateKnowledgeCommand, string> {
  constructor(
    @Inject(KNOWLEDGE_ITEM_REPOSITORY) private readonly itemRepo: IKnowledgeItemRepository,
  ) {}

  async execute(command: CreateKnowledgeCommand): Promise<string> {
    const item = KnowledgeItem.create({
      orgId: command.orgId,
      spaceId: command.spaceId,
      type: command.type,
      title: command.title,
      body: command.body,
      parentId: command.parentId,
      createdByUserId: command.createdByUserId,
    })

    await this.itemRepo.save(item)

    return item.id
  }
}
