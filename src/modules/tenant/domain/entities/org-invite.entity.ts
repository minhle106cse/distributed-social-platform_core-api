import { v7 } from 'uuid'
import type { ManageableOrgRole } from './membership.entity'

export interface OrgInviteProps {
  id: string
  token: string
  orgId: string
  role: ManageableOrgRole
  createdBy: string
  expiresAt: Date
  usedAt: Date | null
  usedBy: string | null
}

export class OrgInvite {
  private _id: string
  private _token: string
  private _orgId: string
  private _role: ManageableOrgRole
  private _createdBy: string
  private _expiresAt: Date
  private _usedAt: Date | null
  private _usedBy: string | null

  private constructor(props: OrgInviteProps) {
    this._id = props.id
    this._token = props.token
    this._orgId = props.orgId
    this._role = props.role
    this._createdBy = props.createdBy
    this._expiresAt = new Date(props.expiresAt.getTime())
    this._usedAt = props.usedAt ? new Date(props.usedAt.getTime()) : null
    this._usedBy = props.usedBy
  }

  // `ManageableOrgRole` excludes OWNER → you cannot mint an invite that makes
  // someone OWNER (privilege escalation), enforced at compile time.
  static create(props: {
    token: string
    orgId: string
    role: ManageableOrgRole
    createdBy: string
    expiresAt: Date
  }): OrgInvite {
    return new OrgInvite({ ...props, id: v7(), usedAt: null, usedBy: null })
  }

  static rehydrate(props: OrgInviteProps): OrgInvite {
    return new OrgInvite(props)
  }

  isExpired(): boolean {
    return new Date() > this._expiresAt
  }

  isUsed(): boolean {
    return this._usedAt !== null
  }

  // Consume the invite in place, binding it to the accepting user.
  accept(userId: string) {
    this._usedAt = new Date()
    this._usedBy = userId
  }

  get id() {
    return this._id
  }
  get token() {
    return this._token
  }
  get orgId() {
    return this._orgId
  }
  get role() {
    return this._role
  }
  get createdBy() {
    return this._createdBy
  }
  get expiresAt() {
    return new Date(this._expiresAt.getTime())
  }
  get usedAt() {
    return this._usedAt ? new Date(this._usedAt.getTime()) : null
  }
  get usedBy() {
    return this._usedBy
  }
}
