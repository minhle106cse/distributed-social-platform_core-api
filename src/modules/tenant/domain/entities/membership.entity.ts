import { v7 } from 'uuid'
import { OrgRole, type ManageableOrgRole } from '../org-rbac'

export interface MembershipProps {
  id: string
  orgId: string
  userId: string
  role: OrgRole
  joinedAt: Date
}

export class Membership {
  private _id: string
  private _orgId: string
  private _userId: string
  private _role: OrgRole
  private _joinedAt: Date

  private constructor(props: MembershipProps) {
    this._id = props.id
    this._orgId = props.orgId
    this._userId = props.userId
    this._role = props.role
    this._joinedAt = new Date(props.joinedAt.getTime())
  }

  // The org founder. OWNER is granted ONLY here — never via invite/member paths.
  static createOwner(props: { orgId: string; userId: string }): Membership {
    return new Membership({ ...props, id: v7(), role: OrgRole.OWNER, joinedAt: new Date() })
  }

  // A regular member (invited / added). `ManageableOrgRole` makes passing OWNER
  // a compile error → no privilege escalation through this path.
  static createMember(props: {
    orgId: string
    userId: string
    role: ManageableOrgRole
  }): Membership {
    return new Membership({ ...props, id: v7(), joinedAt: new Date() })
  }

  static rehydrate(props: MembershipProps): Membership {
    return new Membership(props)
  }

  // Re-grade an existing member in place. Cannot promote to OWNER — ownership
  // transfer is a separate, deliberate operation, not a role edit.
  changeRole(role: ManageableOrgRole) {
    this._role = role
  }

  get id() {
    return this._id
  }
  get orgId() {
    return this._orgId
  }
  get userId() {
    return this._userId
  }
  get role() {
    return this._role
  }
  get joinedAt() {
    return new Date(this._joinedAt.getTime())
  }
}
