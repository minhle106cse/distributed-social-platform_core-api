import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { Vote } from '@/modules/engagement/domain/entities/vote.entity'
import { KnowledgeItemNotFoundError } from '@/common/errors/knowledge.error'
import { CastVoteCommand } from './cast-vote.command'

@Injectable()
@CommandHandler(CastVoteCommand)
export class CastVoteHandler implements ITransactionalCommandHandler<
  CastVoteCommand,
  void,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: CastVoteCommand, tx: CoreApiRepos): Promise<void> {
    const item = await tx.items.findById(command.itemId)
    if (!item) throw new KnowledgeItemNotFoundError()

    const existing = await tx.votes.findByItemAndUser(command.itemId, command.userId)

    if (existing) {
      existing.changeValue(command.value)
      await tx.votes.upsert(existing)
    } else {
      const vote = Vote.create({
        orgId: item.orgId,
        itemId: command.itemId,
        userId: command.userId,
        value: command.value,
      })
      await tx.votes.upsert(vote)
    }
  }
}
