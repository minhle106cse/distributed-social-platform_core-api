import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { BOOKMARK_REPOSITORY } from '@/modules/engagement/domain/repositories/bookmark.repository'
import type { IBookmarkRepository } from '@/modules/engagement/domain/repositories/bookmark.repository'
import { RemoveBookmarkCommand } from './remove-bookmark.command'

@Injectable()
@CommandHandler(RemoveBookmarkCommand)
export class RemoveBookmarkHandler implements ICommandHandler<RemoveBookmarkCommand, void> {
  constructor(@Inject(BOOKMARK_REPOSITORY) private readonly bookmarkRepo: IBookmarkRepository) {}

  async execute(command: RemoveBookmarkCommand): Promise<void> {
    await this.bookmarkRepo.remove(command.itemId, command.userId)
  }
}
