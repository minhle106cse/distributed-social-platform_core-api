import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { Bookmark } from '@/modules/engagement/domain/entities/bookmark.entity'
import { KnowledgeItemNotFoundError } from '@/common/errors/knowledge.error'
import { AddBookmarkCommand } from './add-bookmark.command'

@Injectable()
@CommandHandler(AddBookmarkCommand)
export class AddBookmarkHandler implements ITransactionalCommandHandler<
  AddBookmarkCommand,
  void,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: AddBookmarkCommand, tx: CoreApiRepos): Promise<void> {
    const item = await tx.items.findById(command.itemId)
    if (!item) throw new KnowledgeItemNotFoundError()

    const bookmark = Bookmark.create({
      orgId: item.orgId,
      userId: command.userId,
      itemId: command.itemId,
    })
    await tx.bookmarks.add(bookmark)
  }
}
