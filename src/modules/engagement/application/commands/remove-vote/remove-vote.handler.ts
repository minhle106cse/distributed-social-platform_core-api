import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { VOTE_REPOSITORY } from '@/modules/engagement/domain/repositories/vote.repository'
import type { IVoteRepository } from '@/modules/engagement/domain/repositories/vote.repository'
import { RemoveVoteCommand } from './remove-vote.command'

@Injectable()
@CommandHandler(RemoveVoteCommand)
export class RemoveVoteHandler implements ICommandHandler<RemoveVoteCommand, void> {
  constructor(@Inject(VOTE_REPOSITORY) private readonly voteRepo: IVoteRepository) {}

  async execute(command: RemoveVoteCommand): Promise<void> {
    await this.voteRepo.removeByItemAndUser(command.itemId, command.userId)
  }
}
