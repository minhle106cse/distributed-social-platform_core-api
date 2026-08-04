import type { OrgRole } from '../../domain/org-rbac'
import { MemberDto, MyOrgDto } from './membership.dto'

export interface IMembershipQueryRepository {
  findMembersByOrgId(orgId: string, limit: number, offset: number): Promise<MemberDto[]>
  /** Orgs the user belongs to (login bootstrap — see ListMyOrgsHandler). */
  findOrgsByUserId(userId: string): Promise<MyOrgDto[]>
  /**
   * Role of a user in an org, or null if not a member. Read side of the membership
   * check OrgGuard and CheckMembershipHandler perform: both run OUTSIDE any
   * transaction (a guard runs before the handler that would open one), so they must
   * not reach for the write repository, which since ADR-0001 only exists inside a
   * TxScope. Returns just the role — neither caller needs the entity.
   */
  findRoleByOrgAndUser(orgId: string, userId: string): Promise<OrgRole | null>
}

export const MEMBERSHIP_QUERY_REPOSITORY = Symbol('IMembershipQueryRepository')
