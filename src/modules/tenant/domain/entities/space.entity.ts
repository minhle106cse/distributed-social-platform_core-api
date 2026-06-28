import { v7 } from 'uuid'

export type SpaceVisibility = 'ORG' | 'PRIVATE'

export interface SpaceProps {
  id: string
  orgId: string
  name: string
  visibility: SpaceVisibility
  deletedAt: Date | null
}

export class Space {
  private _id: string
  private _orgId: string
  private _name: string
  private _visibility: SpaceVisibility
  private _deletedAt: Date | null

  private constructor(props: SpaceProps) {
    this._id = props.id
    this._orgId = props.orgId
    this._name = props.name
    this._visibility = props.visibility
    this._deletedAt = props.deletedAt ? new Date(props.deletedAt.getTime()) : null
  }

  static create(props: { orgId: string; name: string; visibility?: SpaceVisibility }): Space {
    return new Space({
      id: v7(),
      orgId: props.orgId,
      name: props.name,
      visibility: props.visibility ?? 'ORG',
      deletedAt: null,
    })
  }

  static rehydrate(props: SpaceProps): Space {
    return new Space(props)
  }

  get id() {
    return this._id
  }
  get orgId() {
    return this._orgId
  }
  get name() {
    return this._name
  }
  get visibility() {
    return this._visibility
  }
  get deletedAt() {
    return this._deletedAt ? new Date(this._deletedAt.getTime()) : null
  }
  get isDeleted() {
    return this._deletedAt !== null
  }
}
