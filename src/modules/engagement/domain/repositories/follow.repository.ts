import type { Follow, FollowTargetType } from '../entities/follow.entity'

export interface IFollowRepository {
  add(follow: Follow): Promise<void>
  remove(userId: string, targetType: FollowTargetType, targetId: string): Promise<void>
}

export const FOLLOW_REPOSITORY = Symbol('IFollowRepository')
