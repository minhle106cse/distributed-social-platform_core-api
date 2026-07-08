import { OrgRole } from '@/modules/tenant/domain/org-rbac'

export interface MemberDto {
  userId: string
  role: OrgRole
  joinedAt: Date
}

export interface MyOrgDto {
  orgId: string
  name: string
  slug: string
  role: string
  joinedAt: Date
}
