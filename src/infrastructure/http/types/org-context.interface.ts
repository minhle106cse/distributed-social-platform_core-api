import type { OrgRole } from '@/modules/tenant/domain/org-rbac'

// Per-request tenant context. Populated by OrgGuard after membership + permission
// resolution, then consumed by @CurrentOrg() and controllers. OrgGuard also pushes
// orgId into AsyncLocalStorage (setTenantId) so repos read it via getTenantId().
export interface OrgContext {
  orgId: string
  orgRole: OrgRole
  permissions: string[]
}
