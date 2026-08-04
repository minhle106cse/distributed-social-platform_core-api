import type { Prisma } from '@/generated'
import { requireTenantId } from '@/common/tenant/tenant.context'
import type { Bookmark } from '../../domain/entities/bookmark.entity'
import type { IBookmarkRepository } from '../../domain/repositories/bookmark.repository'
import { BookmarkMapper } from '../mappers/bookmark.mapper'

export class PrismaBookmarkRepository implements IBookmarkRepository {
  constructor(private readonly client: Prisma.TransactionClient) {}

  async add(bookmark: Bookmark): Promise<void> {
    const data = BookmarkMapper.toPersistence(bookmark)
    await this.client.bookmark.upsert({
      where: { userId_itemId: { userId: bookmark.userId, itemId: bookmark.itemId } },
      create: data,
      update: {},
    })
  }

  async remove(itemId: string, userId: string): Promise<void> {
    await this.client.bookmark.deleteMany({
      where: { itemId, userId, orgId: requireTenantId() },
    })
  }
}
