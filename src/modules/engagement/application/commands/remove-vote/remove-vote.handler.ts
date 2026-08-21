import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { RemoveVoteCommand } from './remove-vote.command'

@Injectable()
@CommandHandler(RemoveVoteCommand)
export class RemoveVoteHandler implements ITransactionalCommandHandler<
  RemoveVoteCommand,
  void,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: RemoveVoteCommand, tx: CoreApiRepos): Promise<void> {
    await tx.votes.removeByItemAndUser(command.itemId, command.userId)
  }
}
