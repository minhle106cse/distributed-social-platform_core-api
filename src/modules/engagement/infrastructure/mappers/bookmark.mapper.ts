import { Bookmark } from '../../domain/entities/bookmark.entity'

type PrismaBookmark = {
  id: string
  orgId: string
  userId: string
  itemId: string
  createdAt: Date
}

export class BookmarkMapper {
  static toDomain(row: PrismaBookmark): Bookmark {
    return Bookmark.rehydrate({
      id: row.id,
      orgId: row.orgId,
      userId: row.userId,
      itemId: row.itemId,
      createdAt: row.createdAt,
    })
  }

  static toPersistence(bookmark: Bookmark) {
    return {
      id: bookmark.id,
      orgId: bookmark.orgId,
      userId: bookmark.userId,
      itemId: bookmark.itemId,
      createdAt: bookmark.createdAt,
    }
  }
}
