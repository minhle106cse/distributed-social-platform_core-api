import { MemberDto } from './get-org-members.dto'

export interface IMembershipQueryRepository {
  findMembersByOrgId(orgId: string, limit: number, offset: number): Promise<MemberDto[]>
}

export const MEMBERSHIP_QUERY_REPOSITORY = Symbol('IMembershipQueryRepository')
