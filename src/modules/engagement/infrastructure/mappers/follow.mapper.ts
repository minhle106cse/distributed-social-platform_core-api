import { Follow } from '../../domain/entities/follow.entity'
import type { FollowTargetType } from '../../domain/entities/follow.entity'

type PrismaFollow = {
  id: string
  orgId: string
  userId: string
  targetType: string
  targetId: string
  createdAt: Date
}

export class FollowMapper {
  static toDomain(row: PrismaFollow): Follow {
    return Follow.rehydrate({
      id: row.id,
      orgId: row.orgId,
      userId: row.userId,
      targetType: row.targetType as FollowTargetType,
      targetId: row.targetId,
      createdAt: row.createdAt,
    })
  }

  static toPersistence(follow: Follow) {
    return {
      id: follow.id,
      orgId: follow.orgId,
      userId: follow.userId,
      targetType: follow.targetType,
      targetId: follow.targetId,
      createdAt: follow.createdAt,
    }
  }
}
