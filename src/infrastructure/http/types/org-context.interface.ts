import type { OrgRole } from '@/modules/tenant/domain/entities/membership.entity'

// Per-request tenant context. Populated by OrgGuard after membership + permission
// resolution, then consumed by TenantInterceptor, @CurrentOrg() and controllers.
export interface OrgContext {
  orgId: string
  orgRole: OrgRole
  permissions: string[]
}
