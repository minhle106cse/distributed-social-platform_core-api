import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { RemoveBookmarkCommand } from './remove-bookmark.command'

@Injectable()
@CommandHandler(RemoveBookmarkCommand)
export class RemoveBookmarkHandler implements ITransactionalCommandHandler<
  RemoveBookmarkCommand,
  void,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: RemoveBookmarkCommand, tx: CoreApiRepos): Promise<void> {
    await tx.bookmarks.remove(command.itemId, command.userId)
  }
}
