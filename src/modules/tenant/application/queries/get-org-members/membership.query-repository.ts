import { MemberDto } from './get-org-members.dto'
import { MyOrgDto } from '../list-my-orgs/list-my-orgs.dto'

export interface IMembershipQueryRepository {
  findMembersByOrgId(orgId: string, limit: number, offset: number): Promise<MemberDto[]>
  /** Orgs the user belongs to (login bootstrap — see ListMyOrgsHandler). */
  findOrgsByUserId(userId: string): Promise<MyOrgDto[]>
}

export const MEMBERSHIP_QUERY_REPOSITORY = Symbol('IMembershipQueryRepository')
