import { v7 } from 'uuid'

export interface BookmarkProps {
  id: string
  orgId: string
  userId: string
  itemId: string
  createdAt: Date
}

export class Bookmark {
  private _id: string
  private _orgId: string
  private _userId: string
  private _itemId: string
  private _createdAt: Date

  private constructor(props: BookmarkProps) {
    this._id = props.id
    this._orgId = props.orgId
    this._userId = props.userId
    this._itemId = props.itemId
    this._createdAt = new Date(props.createdAt.getTime())
  }

  static create(props: { orgId: string; userId: string; itemId: string }): Bookmark {
    return new Bookmark({
      id: v7(),
      orgId: props.orgId,
      userId: props.userId,
      itemId: props.itemId,
      createdAt: new Date(),
    })
  }

  static rehydrate(props: BookmarkProps): Bookmark {
    return new Bookmark(props)
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
  get itemId(): string {
    return this._itemId
  }
  get createdAt(): Date {
    return new Date(this._createdAt.getTime())
  }
}
