import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { KnowledgeItemNotFoundError } from '@/common/errors/knowledge.error'
import { VerifyKnowledgeCommand } from './verify-knowledge.command'

@Injectable()
@CommandHandler(VerifyKnowledgeCommand)
export class VerifyKnowledgeHandler implements ITransactionalCommandHandler<
  VerifyKnowledgeCommand,
  void,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: VerifyKnowledgeCommand, tx: CoreApiRepos): Promise<void> {
    const item = await tx.items.findById(command.id)
    if (!item) throw new KnowledgeItemNotFoundError()

    item.verify(command.verifierUserId)
    await tx.items.update(item)
  }
}
