import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { Bookmark } from '@/modules/engagement/domain/entities/bookmark.entity'
import { KNOWLEDGE_ITEM_REPOSITORY } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import { BOOKMARK_REPOSITORY } from '@/modules/engagement/domain/repositories/bookmark.repository'
import type { IBookmarkRepository } from '@/modules/engagement/domain/repositories/bookmark.repository'
import { KnowledgeItemNotFoundError } from '@/common/errors/knowledge.error'
import { AddBookmarkCommand } from './add-bookmark.command'

@Injectable()
@CommandHandler(AddBookmarkCommand)
export class AddBookmarkHandler implements ICommandHandler<AddBookmarkCommand, void> {
  constructor(
    @Inject(KNOWLEDGE_ITEM_REPOSITORY) private readonly itemRepo: IKnowledgeItemRepository,
    @Inject(BOOKMARK_REPOSITORY) private readonly bookmarkRepo: IBookmarkRepository,
  ) {}

  async execute(command: AddBookmarkCommand): Promise<void> {
    const item = await this.itemRepo.findById(command.itemId)
    if (!item) throw new KnowledgeItemNotFoundError()

    const bookmark = Bookmark.create({
      orgId: item.orgId,
      userId: command.userId,
      itemId: command.itemId,
    })
    await this.bookmarkRepo.add(bookmark)
  }
}
