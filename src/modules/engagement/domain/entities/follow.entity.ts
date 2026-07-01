import { v7 } from 'uuid'

export type FollowTargetType = 'DOCUMENT' | 'SPACE'

export interface FollowProps {
  id: string
  orgId: string
  userId: string
  targetType: FollowTargetType
  targetId: string
  createdAt: Date
}

export class Follow {
  private _id: string
  private _orgId: string
  private _userId: string
  private _targetType: FollowTargetType
  private _targetId: string
  private _createdAt: Date

  private constructor(props: FollowProps) {
    this._id = props.id
    this._orgId = props.orgId
    this._userId = props.userId
    this._targetType = props.targetType
    this._targetId = props.targetId
    this._createdAt = new Date(props.createdAt.getTime())
  }

  static create(props: {
    orgId: string
    userId: string
    targetType: FollowTargetType
    targetId: string
  }): Follow {
    return new Follow({
      id: v7(),
      orgId: props.orgId,
      userId: props.userId,
      targetType: props.targetType,
      targetId: props.targetId,
      createdAt: new Date(),
    })
  }

  static rehydrate(props: FollowProps): Follow {
    return new Follow(props)
  }

  /**
   * Stable identity of a follow *relationship* (user↔target), used as the Kafka
   * partition key for BOTH FollowCreated and FollowRemoved. It must NOT be the
   * random row id: create keys by row id and remove has no row id, so keying by
   * row id would scatter the two lifecycle events across partitions and let an
   * unfollow be processed before its follow (ghost-follower bug). Keying both by
   * this composite guarantees per-relationship ordering — exactly the projection
   * PK [spaceId, userId] semantics on the consumer side.
   */
  static streamKey(userId: string, targetType: FollowTargetType, targetId: string): string {
    return `${userId}:${targetType}:${targetId}`
  }

  get id(): string {
    return this._id
  }
  get orgId(): string {
    return this._orgId
  }
  get userId(): string {
    return this._userId
  }
  get targetType(): FollowTargetType {
    return this._targetType
  }
  get targetId(): string {
    return this._targetId
  }
  get createdAt(): Date {
    return new Date(this._createdAt.getTime())
  }
}
