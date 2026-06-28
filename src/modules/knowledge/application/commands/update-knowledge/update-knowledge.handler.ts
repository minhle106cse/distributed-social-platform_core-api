import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { Revision } from '@/modules/knowledge/domain/entities/revision.entity'
import { KNOWLEDGE_ITEM_REPOSITORY } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import { REVISION_REPOSITORY } from '@/modules/knowledge/domain/repositories/revision.repository'
import type { IRevisionRepository } from '@/modules/knowledge/domain/repositories/revision.repository'
import {
  KnowledgeItemNotFoundError,
  KnowledgeVersionConflictError,
} from '@/common/errors/knowledge.error'
import { UpdateKnowledgeCommand } from './update-knowledge.command'

@Injectable()
@CommandHandler(UpdateKnowledgeCommand)
export class UpdateKnowledgeHandler implements ICommandHandler<UpdateKnowledgeCommand, void> {
  constructor(
    @Inject(KNOWLEDGE_ITEM_REPOSITORY) private readonly itemRepo: IKnowledgeItemRepository,
    @Inject(REVISION_REPOSITORY) private readonly revisionRepo: IRevisionRepository,
  ) {}

  async execute(command: UpdateKnowledgeCommand): Promise<void> {
    const item = await this.itemRepo.findById(command.id)
    if (!item) throw new KnowledgeItemNotFoundError()

    item.applyEdit({
      title: command.title,
      body: command.body,
      editedByUserId: command.editedByUserId,
    })

    const ok = await this.itemRepo.updateWithOcc(item, command.expectedVersion)
    if (!ok) throw new KnowledgeVersionConflictError()

    await this.revisionRepo.save(
      Revision.create({
        itemId: item.id,
        version: item.version,
        bodySnapshot: item.body,
        editedByUserId: command.editedByUserId,
      }),
    )
  }
}
