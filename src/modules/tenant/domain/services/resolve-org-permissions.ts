import { Inject, Injectable } from '@nestjs/common'
import { ALL_ORG_PERMISSIONS } from '@distributed-social-platform/shared-kernel'
import { OrgRole } from '../org-rbac'
import { ORG_ROLE_PERMISSION_REPOSITORY } from '../repositories/org-role-permission.repository'
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
@Injectable()
export class OrgPermissionResolver {
  constructor(
    @Inject(ORG_ROLE_PERMISSION_REPOSITORY)
    private readonly rolePermissionRepo: IOrgRolePermissionRepository,
  ) {}

  async resolve(orgId: string, role: OrgRole): Promise<string[]> {
    if (role === OrgRole.OWNER) return [...ALL_ORG_PERMISSIONS]
    return this.rolePermissionRepo.findByOrgAndRole(orgId, role)
  }
}
