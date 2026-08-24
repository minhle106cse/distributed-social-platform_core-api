import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { Revision } from '@/modules/knowledge/domain/entities/revision.entity'
import {
  KnowledgeItemNotFoundError,
  KnowledgeVersionConflictError,
} from '@/modules/knowledge/domain/knowledge.error'
import { UpdateKnowledgeCommand } from './update-knowledge.command'

@Injectable()
@CommandHandler(UpdateKnowledgeCommand)
export class UpdateKnowledgeHandler implements ITransactionalCommandHandler<
  UpdateKnowledgeCommand,
  void,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: UpdateKnowledgeCommand, tx: CoreApiRepos): Promise<void> {
    const item = await tx.items.findById(command.id)
    if (!item) throw new KnowledgeItemNotFoundError()

    item.applyEdit({
      title: command.title,
      body: command.body,
      editedByUserId: command.editedByUserId,
    })

    const ok = await tx.items.updateWithOcc(item, command.expectedVersion)
    if (!ok) throw new KnowledgeVersionConflictError()

    await tx.revisions.save(
      Revision.create({
        itemId: item.id,
        version: item.version,
        bodySnapshot: item.body,
        editedByUserId: command.editedByUserId,
      }),
    )
  }
}
