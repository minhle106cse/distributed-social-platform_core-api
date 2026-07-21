import { OrgPermission, type OrgPermissionValue } from '@distributed-social-platform/shared-kernel'

// ── Org Role Catalog (closed set — see directives/multi_tenancy.md) ──────────
// Unlike SystemRole (auth-service, dynamic — created via POST /roles), Org
// roles are a FIXED enum: you can only assign/revoke them and edit their
// permission mapping, never create a 5th role at runtime.
export const ORG_ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'GUEST'] as const
export type OrgRole = (typeof ORG_ROLES)[number]

// Reference roles without magic strings, e.g. `OrgRole.OWNER`.
// `satisfies Record<OrgRole, OrgRole>` keeps this in sync with ORG_ROLES:
// add a role to the array and TS forces a matching key here.
export const OrgRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  GUEST: 'GUEST',
} as const satisfies Record<OrgRole, OrgRole>

// Roles that can be assigned to a regular member (everything except OWNER).
// OWNER is implicit-all and granted only to the org founder — assigning it via
// invite / member / role-change must be a compile error, not a runtime check.
export type ManageableOrgRole = Exclude<OrgRole, 'OWNER'>

// ── Org Permission Catalog — MOVED to shared-kernel (packages/shared-kernel/
// src/auth/org-permissions.ts) once search-service/notification-service also
// needed to check these codes remotely (gRPC MembershipVerification). Import
// `OrgPermission`/`OrgPermissionValue`/`ALL_ORG_PERMISSIONS`/`isValidOrgPermission`
// from `@distributed-social-platform/shared-kernel` directly — re-exported
// here only where DEFAULT_ROLE_PERMISSIONS below needs the value.

// ── Default Mapping (SEED only) ──────────────────────────────────────────────
// Chỉ dùng để khởi tạo org_role_permissions khi tạo org. Runtime đọc từ DB.
// OWNER KHÔNG có ở đây — OrgGuard cấp toàn bộ quyền cho OWNER (implicit) để chống lock-out.
export const DEFAULT_ROLE_PERMISSIONS: Record<Exclude<OrgRole, 'OWNER'>, OrgPermissionValue[]> = {
  ADMIN: [
    OrgPermission.KNOWLEDGE_READ,
    OrgPermission.KNOWLEDGE_WRITE,
    OrgPermission.KNOWLEDGE_VERIFY,
    OrgPermission.ENGAGEMENT_VOTE,
    OrgPermission.ENGAGEMENT_BOOKMARK,
    OrgPermission.ENGAGEMENT_FOLLOW,
    OrgPermission.ENGAGEMENT_ACCEPT_ANSWER,
    OrgPermission.AI_QUERY,
    OrgPermission.CREDIT_READ,
    OrgPermission.CREDIT_SPEND,
    OrgPermission.CREDIT_GRANT,
    OrgPermission.ORG_MANAGE_MEMBERS,
    OrgPermission.ORG_MANAGE_SPACES,
  ],
  MEMBER: [
    OrgPermission.KNOWLEDGE_READ,
    OrgPermission.KNOWLEDGE_WRITE,
    OrgPermission.ENGAGEMENT_VOTE,
    OrgPermission.ENGAGEMENT_BOOKMARK,
    OrgPermission.ENGAGEMENT_FOLLOW,
    OrgPermission.ENGAGEMENT_ACCEPT_ANSWER,
    OrgPermission.AI_QUERY,
    OrgPermission.CREDIT_READ,
    OrgPermission.CREDIT_SPEND,
  ],
  GUEST: [OrgPermission.KNOWLEDGE_READ],
}
