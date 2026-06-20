export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST'

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

  get id() { return this.props.id }
  get orgId() { return this.props.orgId }
  get userId() { return this.props.userId }
  get role() { return this.props.role }
  get joinedAt() { return this.props.joinedAt }

  toSnapshot(): MembershipProps {
    return { ...this.props }
  }
}
