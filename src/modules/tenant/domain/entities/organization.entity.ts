import { v7 } from 'uuid'

export interface OrganizationProps {
  id: string
  name: string
  slug: string
  seatLimit: number
  createdAt: Date
  deletedAt: Date | null
}

export class Organization {
  private _id: string
  private _name: string
  private _slug: string
  private _seatLimit: number
  private _createdAt: Date
  private _deletedAt: Date | null

  private constructor(props: OrganizationProps) {
    this._id = props.id
    this._name = props.name
    this._slug = props.slug
    this._seatLimit = props.seatLimit
    this._createdAt = new Date(props.createdAt.getTime())
    this._deletedAt = props.deletedAt ? new Date(props.deletedAt.getTime()) : null
  }

  static create(props: { name: string; slug: string; seatLimit?: number }): Organization {
    return new Organization({
      id: v7(),
      name: props.name,
      slug: props.slug,
      seatLimit: props.seatLimit ?? 10,
      createdAt: new Date(),
      deletedAt: null,
    })
  }

  static rehydrate(props: OrganizationProps): Organization {
    return new Organization(props)
  }

  get id() {
    return this._id
  }
  get name() {
    return this._name
  }
  get slug() {
    return this._slug
  }
  get seatLimit() {
    return this._seatLimit
  }
  get createdAt() {
    return new Date(this._createdAt.getTime())
  }
  get deletedAt() {
    return this._deletedAt ? new Date(this._deletedAt.getTime()) : null
  }
  get isDeleted() {
    return this._deletedAt !== null
  }

  softDelete(): void {
    this._deletedAt = new Date()
  }
}
