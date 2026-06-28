import { Injectable } from '@nestjs/common'
import type { Prisma } from '@/generated'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { getTx } from '@distributed-social-platform/shared-kernel'
import { requireTenantId } from '@/common/tenant/tenant.context'
import type { Follow } from '../../domain/entities/follow.entity'
import type { FollowTargetType } from '../../domain/entities/follow.entity'
import type { IFollowRepository } from '../../domain/repositories/follow.repository'
import { FollowMapper } from '../mappers/follow.mapper'

@Injectable()
export class PrismaFollowRepository implements IFollowRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get client(): Prisma.TransactionClient {
    return getTx<Prisma.TransactionClient>() ?? this.prisma.client
  }

  async add(follow: Follow): Promise<void> {
    const data = FollowMapper.toPersistence(follow)
    await this.client.follow.upsert({
      where: {
        userId_targetType_targetId: {
          userId: follow.userId,
          targetType: follow.targetType as never,
          targetId: follow.targetId,
        },
      },
      create: { ...data, targetType: data.targetType as never },
      update: {},
    })
  }

  async remove(userId: string, targetType: FollowTargetType, targetId: string): Promise<void> {
    await this.client.follow.deleteMany({
      where: { userId, targetType: targetType as never, targetId, orgId: requireTenantId() },
    })
  }
}
