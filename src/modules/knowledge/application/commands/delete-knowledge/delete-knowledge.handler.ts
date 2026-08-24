import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { KnowledgeItemNotFoundError } from '@/modules/knowledge/domain/knowledge.error'
import { DeleteKnowledgeCommand } from './delete-knowledge.command'

@Injectable()
@CommandHandler(DeleteKnowledgeCommand)
export class DeleteKnowledgeHandler implements ITransactionalCommandHandler<
  DeleteKnowledgeCommand,
  void,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: DeleteKnowledgeCommand, tx: CoreApiRepos): Promise<void> {
    const item = await tx.items.findById(command.id)
    if (!item) throw new KnowledgeItemNotFoundError()

    item.softDelete()
    await tx.items.update(item)
  }
}
