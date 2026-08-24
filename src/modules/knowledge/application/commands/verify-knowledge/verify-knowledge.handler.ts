import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { KnowledgeItemNotFoundError } from '@/modules/knowledge/domain/knowledge.error'
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

    // Already verified → nothing changed, so there is nothing to persist. The
    // guard is on the WRITE, not just on the flag: re-running update() would
    // re-stamp updatedByUserId with this caller even though the earlier verifier
    // is the one who actually verified it.
    if (!item.verify(command.verifierUserId)) return

    await tx.items.update(item)
  }
}
