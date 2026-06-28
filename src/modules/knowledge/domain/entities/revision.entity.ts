import { v7 } from 'uuid'

export interface RevisionProps {
  id: string
  itemId: string
  version: number
  bodySnapshot: string
  editedByUserId: string
  createdAt: Date
}

export class Revision {
  private _id: string
  private _itemId: string
  private _version: number
  private _bodySnapshot: string
  private _editedByUserId: string
  private _createdAt: Date

  private constructor(props: RevisionProps) {
    this._id = props.id
    this._itemId = props.itemId
    this._version = props.version
    this._bodySnapshot = props.bodySnapshot
    this._editedByUserId = props.editedByUserId
    this._createdAt = new Date(props.createdAt.getTime())
  }

  static create(props: {
    itemId: string
    version: number
    bodySnapshot: string
    editedByUserId: string
  }): Revision {
    return new Revision({
      id: v7(),
      itemId: props.itemId,
      version: props.version,
      bodySnapshot: props.bodySnapshot,
      editedByUserId: props.editedByUserId,
      createdAt: new Date(),
    })
  }

  static rehydrate(props: RevisionProps): Revision {
    return new Revision(props)
  }

  get id(): string {
    return this._id
  }
  get itemId(): string {
    return this._itemId
  }
  get version(): number {
    return this._version
  }
  get bodySnapshot(): string {
    return this._bodySnapshot
  }
  get editedByUserId(): string {
    return this._editedByUserId
  }
  get createdAt(): Date {
    return new Date(this._createdAt.getTime())
  }
}
