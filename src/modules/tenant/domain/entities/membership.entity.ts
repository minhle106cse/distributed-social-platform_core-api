export const ORG_ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'GUEST'] as const
export type OrgRole = (typeof ORG_ROLES)[number]

// Reference roles without magic strings, e.g. `OrgRole.OWNER`.
// `satisfies Record<OrgRole, OrgRole>` keeps this in sync with ORG_ROLES:
// add a role to the array and TS forces a matching key here.
export const OrgRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  GUEST: 'GUEST',
} as const satisfies Record<OrgRole, OrgRole>

// Roles that can be assigned to a regular member (everything except OWNER).
// OWNER is implicit-all and granted only to the org founder — assigning it via
// invite / member / role-change must be a compile error, not a runtime check.
export type ManageableOrgRole = Exclude<OrgRole, 'OWNER'>

export interface MembershipProps {
  id: string
  orgId: string
  userId: string
  role: OrgRole
  joinedAt: Date
}

export class Membership {
  private readonly props: MembershipProps

  private constructor(props: MembershipProps) {
    this.props = { ...props }
  }

  // The org founder. OWNER is granted ONLY here — never via invite/member paths.
  static createOwner(props: { id: string; orgId: string; userId: string }): Membership {
    return new Membership({ ...props, role: OrgRole.OWNER, joinedAt: new Date() })
  }

  // A regular member (invited / added). `ManageableOrgRole` makes passing OWNER
  // a compile error → no privilege escalation through this path.
  static createMember(props: {
    id: string
    orgId: string
    userId: string
    role: ManageableOrgRole
  }): Membership {
    return new Membership({ ...props, joinedAt: new Date() })
  }

  static rehydrate(props: MembershipProps): Membership {
    return new Membership(props)
  }

  // Re-grade an existing member. Cannot promote to OWNER — ownership transfer is
  // a separate, deliberate operation, not a role edit.
  changeRole(role: ManageableOrgRole): Membership {
    return new Membership({ ...this.props, role })
  }

  get id() {
    return this.props.id
  }
  get orgId() {
    return this.props.orgId
  }
  get userId() {
    return this.props.userId
  }
  get role() {
    return this.props.role
  }
  get joinedAt() {
    return this.props.joinedAt
  }

  toSnapshot(): MembershipProps {
    return { ...this.props }
  }
}
