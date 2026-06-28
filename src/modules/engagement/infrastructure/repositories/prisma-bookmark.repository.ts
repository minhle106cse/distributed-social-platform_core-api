import { Injectable } from '@nestjs/common'
import type { Prisma } from '@/generated'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { getTx } from '@distributed-social-platform/shared-kernel'
import { requireTenantId } from '@/common/tenant/tenant.context'
import type { Bookmark } from '../../domain/entities/bookmark.entity'
import type { IBookmarkRepository } from '../../domain/repositories/bookmark.repository'
import { BookmarkMapper } from '../mappers/bookmark.mapper'

@Injectable()
export class PrismaBookmarkRepository implements IBookmarkRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get client(): Prisma.TransactionClient {
    return getTx<Prisma.TransactionClient>() ?? this.prisma.client
  }

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
