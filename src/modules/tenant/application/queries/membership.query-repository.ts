import { MemberDto, MyOrgDto } from './membership.dto'

export interface IMembershipQueryRepository {
  findMembersByOrgId(orgId: string, limit: number, offset: number): Promise<MemberDto[]>
  /** Orgs the user belongs to (login bootstrap — see ListMyOrgsHandler). */
  findOrgsByUserId(userId: string): Promise<MyOrgDto[]>
}

export const MEMBERSHIP_QUERY_REPOSITORY = Symbol('IMembershipQueryRepository')
