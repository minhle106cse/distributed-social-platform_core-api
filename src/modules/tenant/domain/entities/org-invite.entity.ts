import type { OrgRole } from './membership.entity'

export interface OrgInviteProps {
  id: string
  token: string
  orgId: string
  role: OrgRole
  createdBy: string
  expiresAt: Date
  usedAt: Date | null
  usedBy: string | null
}

export class OrgInvite {
  private readonly props: OrgInviteProps

  private constructor(props: OrgInviteProps) {
    this.props = { ...props }
  }

  static create(props: {
    id: string
    token: string
    orgId: string
    role: OrgRole
    createdBy: string
    expiresAt: Date
  }): OrgInvite {
    return new OrgInvite({ ...props, usedAt: null, usedBy: null })
  }

  static rehydrate(props: OrgInviteProps): OrgInvite {
    return new OrgInvite(props)
  }

  isExpired(): boolean {
    return new Date() > this.props.expiresAt
  }

  isUsed(): boolean {
    return this.props.usedAt !== null
  }

  accept(userId: string): OrgInvite {
    return new OrgInvite({ ...this.props, usedAt: new Date(), usedBy: userId })
  }

  get id() {
    return this.props.id
  }
  get token() {
    return this.props.token
  }
  get orgId() {
    return this.props.orgId
  }
  get role() {
    return this.props.role
  }
  get createdBy() {
    return this.props.createdBy
  }
  get expiresAt() {
    return this.props.expiresAt
  }
  get usedAt() {
    return this.props.usedAt
  }
  get usedBy() {
    return this.props.usedBy
  }

  toSnapshot(): OrgInviteProps {
    return { ...this.props }
  }
}
