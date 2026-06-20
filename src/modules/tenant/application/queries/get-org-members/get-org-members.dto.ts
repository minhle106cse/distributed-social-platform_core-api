import { OrgRole } from '@/modules/tenant/domain/entities/membership.entity'

export interface MemberDto {
  userId: string
  role: OrgRole
  joinedAt: Date
}
