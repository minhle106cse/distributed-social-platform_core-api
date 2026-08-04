import type { Prisma } from '@/generated'
import { requireTenantId } from '@/common/tenant/tenant.context'
import type { Follow } from '../../domain/entities/follow.entity'
import type { FollowTargetType } from '../../domain/entities/follow.entity'
import type { IFollowRepository } from '../../domain/repositories/follow.repository'
import { FollowMapper } from '../mappers/follow.mapper'

export class PrismaFollowRepository implements IFollowRepository {
  constructor(private readonly client: Prisma.TransactionClient) {}

  async add(follow: Follow): Promise<void> {
    const data = FollowMapper.toPersistence(follow)
    await this.client.follow.upsert({
      where: {
        userId_targetType_targetId: {
          userId: follow.userId,
          targetType: follow.targetType,
          targetId: follow.targetId,
        },
      },
      create: data,
      update: {},
    })
  }

  async remove(userId: string, targetType: FollowTargetType, targetId: string): Promise<void> {
    await this.client.follow.deleteMany({
      where: { userId, targetType, targetId, orgId: requireTenantId() },
    })
  }
}
