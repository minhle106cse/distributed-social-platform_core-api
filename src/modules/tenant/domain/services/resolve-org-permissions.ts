import { ALL_ORG_PERMISSIONS } from '@distributed-social-platform/shared-kernel'
import { OrgRole } from '../org-rbac'
import type { IOrgRolePermissionRepository } from '../repositories/org-role-permission.repository'

// OWNER is implicit-all (no DB row needed) to prevent lock-out — every other
// role resolves from org_role_permissions. Single source of truth for this
// rule: OrgGuard (local HTTP check) and MembershipVerificationGrpcService
// (remote check, consumed by search-service/notification-service) both
// inject this instead of each re-deriving the OWNER special-case — avoids
// the exact kind of drift bug already caught once for
// SUPER_ADMIN/SystemPermission (see .ai/KNOWLEDGE_INDEX.md,
// "super-admin-implicit-all-never-wired-into-jwt").
// TODO(Phase 3): cache kết quả vào Redis (key org_perms:{orgId}:{role}, TTL 5') + invalidate khi update.
//
// Deliberately framework-agnostic (2026-07-25 fix) — this is Domain layer,
// so it must not import @nestjs/common. Was the ONLY file under any
// `domain/` folder in this service doing so (verified via repo-wide grep).
// NestJS wiring lives at the composition root (tenant.module.ts) via
// useFactory/inject, same pattern already used for shared-kernel's
// QueryBus/EventBus/LoggingMiddleware/RetryMiddleware/TransactionMiddleware
// (infrastructure/cqrs/cqrs.module.ts) — not a new pattern invented here.
export class OrgPermissionResolver {
  constructor(private readonly rolePermissionRepo: IOrgRolePermissionRepository) {}

  async resolve(orgId: string, role: OrgRole): Promise<string[]> {
    if (role === OrgRole.OWNER) return [...ALL_ORG_PERMISSIONS]
    return this.rolePermissionRepo.findByOrgAndRole(orgId, role)
  }
}
