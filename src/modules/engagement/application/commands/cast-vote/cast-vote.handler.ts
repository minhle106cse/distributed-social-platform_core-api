import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { Vote } from '@/modules/engagement/domain/entities/vote.entity'
import { KNOWLEDGE_ITEM_REPOSITORY } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import { VOTE_REPOSITORY } from '@/modules/engagement/domain/repositories/vote.repository'
import type { IVoteRepository } from '@/modules/engagement/domain/repositories/vote.repository'
import { KnowledgeItemNotFoundError } from '@/common/errors/knowledge.error'
import { CastVoteCommand } from './cast-vote.command'

@Injectable()
@CommandHandler(CastVoteCommand)
export class CastVoteHandler implements ICommandHandler<CastVoteCommand, void> {
  constructor(
    @Inject(KNOWLEDGE_ITEM_REPOSITORY) private readonly itemRepo: IKnowledgeItemRepository,
    @Inject(VOTE_REPOSITORY) private readonly voteRepo: IVoteRepository,
  ) {}

  async execute(command: CastVoteCommand): Promise<void> {
    const item = await this.itemRepo.findById(command.itemId)
    if (!item) throw new KnowledgeItemNotFoundError()

    const existing = await this.voteRepo.findByItemAndUser(command.itemId, command.userId)

    if (existing) {
      existing.changeValue(command.value)
      await this.voteRepo.upsert(existing)
    } else {
      const vote = Vote.create({
        orgId: item.orgId,
        itemId: command.itemId,
        userId: command.userId,
        value: command.value,
      })
      await this.voteRepo.upsert(vote)
    }
  }
}
