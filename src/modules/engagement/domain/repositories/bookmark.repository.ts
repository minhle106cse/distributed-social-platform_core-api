import type { Bookmark } from '../entities/bookmark.entity'

export interface IBookmarkRepository {
  add(bookmark: Bookmark): Promise<void>
  remove(itemId: string, userId: string): Promise<void>
}

export const BOOKMARK_REPOSITORY = Symbol('IBookmarkRepository')
