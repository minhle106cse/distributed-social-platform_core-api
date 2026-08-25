import { ALL_ORG_PERMISSIONS } from '@distributed-social-platform/shared-kernel'
import { OrgRole } from '../org-rbac'
import type { IOrgRolePermissionReader } from '../repositories/org-role-permission.repository'

// OWNER is implicit-all (no DB row needed) to prevent lock-out — every other
// role resolves from org_role_permissions. Single source of truth for this
// rule: OrgGuard (local HTTP check) and MembershipVerificationGrpcService
// (remote check, consumed by search-service/notification-service) both
// inject this instead of each re-deriving the OWNER special-case — avoids
// the exact kind of drift bug already caught once for
// SUPER_ADMIN/SystemPermission (see .ai/KNOWLEDGE_INDEX.md,
// "super-admin-implicit-all-never-wired-into-jwt").
// NOT cached here, deliberately (re-assessed 2026-08-25). This runs inside
// core-api's own OrgGuard, i.e. one query against core_db in-process — there is
// no cross-service hop to avoid, which is the whole reason search-service and
// notification-service cache the same answer. The cache those two use
// (`CacheKeys.orgPermissions`, invalidated in UpdateRolePermissionsHandler's
// afterCommit) is already keyed by (orgId, role), so wiring OrgGuard onto it
// later needs no new key, no new invalidation, and no proto change — only a
// decision that a local DB round-trip per request is worth removing.
//
// Deliberately framework-agnostic (2026-07-25 fix) — this is Domain layer,
// so it must not import @nestjs/common. Was the ONLY file under any
// `domain/` folder in this service doing so (verified via repo-wide grep).
// NestJS wiring lives at the composition root (tenant.module.ts) via
// useFactory/inject, same pattern already used for shared-kernel's
// QueryBus/EventBus/LoggingMiddleware/RetryMiddleware/TransactionMiddleware
// (infrastructure/cqrs/cqrs.module.ts) — not a new pattern invented here.
export class OrgPermissionResolver {
  // Reader, not the write repository: this resolves permissions for a guard, which
  // runs before any transaction exists (ADR-0001).
  constructor(private readonly rolePermissionRepo: IOrgRolePermissionReader) {}

  async resolve(orgId: string, role: OrgRole): Promise<string[]> {
    if (role === OrgRole.OWNER) return [...ALL_ORG_PERMISSIONS]
    return this.rolePermissionRepo.findByOrgAndRole(orgId, role)
  }
}
