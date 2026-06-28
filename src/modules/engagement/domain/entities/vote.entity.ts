import { v7 } from 'uuid'

export interface VoteProps {
  id: string
  orgId: string
  itemId: string
  userId: string
  value: number
  createdAt: Date
}

export class Vote {
  private _id: string
  private _orgId: string
  private _itemId: string
  private _userId: string
  private _value: number
  private _createdAt: Date

  private constructor(props: VoteProps) {
    this._id = props.id
    this._orgId = props.orgId
    this._itemId = props.itemId
    this._userId = props.userId
    this._value = props.value
    this._createdAt = new Date(props.createdAt.getTime())
  }

  static create(props: { orgId: string; itemId: string; userId: string; value: number }): Vote {
    return new Vote({
      id: v7(),
      orgId: props.orgId,
      itemId: props.itemId,
      userId: props.userId,
      value: props.value,
      createdAt: new Date(),
    })
  }

  static rehydrate(props: VoteProps): Vote {
    return new Vote(props)
  }

  changeValue(value: number): void {
    this._value = value
  }

  get id(): string {
    return this._id
  }
  get orgId(): string {
    return this._orgId
  }
  get itemId(): string {
    return this._itemId
  }
  get userId(): string {
    return this._userId
  }
  get value(): number {
    return this._value
  }
  get createdAt(): Date {
    return new Date(this._createdAt.getTime())
  }
}
