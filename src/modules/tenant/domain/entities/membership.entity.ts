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

// Anti-corruption boundary: parse a raw persistence string into the domain
// union. Throws (→ 500) if the DB value drifts from the schema enum, instead of
// silently producing a role that fails every permission check.
export function toOrgRole(value: string): OrgRole {
  if ((ORG_ROLES as readonly string[]).includes(value)) return value as OrgRole
  throw new Error(`Unknown OrgRole from persistence: "${value}"`)
}

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

  static create(props: { id: string; orgId: string; userId: string; role?: OrgRole }): Membership {
    return new Membership({
      id: props.id,
      orgId: props.orgId,
      userId: props.userId,
      role: props.role ?? 'MEMBER',
      joinedAt: new Date(),
    })
  }

  static rehydrate(props: MembershipProps): Membership {
    return new Membership(props)
  }

  changeRole(role: OrgRole): Membership {
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
