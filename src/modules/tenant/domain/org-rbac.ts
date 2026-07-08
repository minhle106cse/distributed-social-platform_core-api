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

// ── Org Permission Catalog (code = source of truth) ──────────────────────────
// Also a closed set, same as OrgRole above — unlike SystemPermission
// (auth-service, dynamic — created via POST /permissions). Mỗi permission gắn
// với một feature/endpoint cụ thể. Thêm permission = thêm code.
// "Ai có permission nào" (mapping role→permission) lưu trong DB org_role_permissions.
export const OrgPermission = {
  // Knowledge
  KNOWLEDGE_READ: 'knowledge:read',
  KNOWLEDGE_WRITE: 'knowledge:write',
  KNOWLEDGE_VERIFY: 'knowledge:verify',

  // Engagement
  ENGAGEMENT_VOTE: 'engagement:vote',
  ENGAGEMENT_BOOKMARK: 'engagement:bookmark',
  ENGAGEMENT_FOLLOW: 'engagement:follow',
  ENGAGEMENT_ACCEPT_ANSWER: 'engagement:accept_answer',

  // AI
  AI_QUERY: 'ai:query',

  // Credit economy
  CREDIT_READ: 'credit:read',
  CREDIT_SPEND: 'credit:spend',
  CREDIT_GRANT: 'credit:grant', // distribute org credit to members (admin/owner)

  // Org management
  ORG_MANAGE_MEMBERS: 'org:manage_members',
  ORG_MANAGE_SPACES: 'org:manage_spaces',
  ORG_MANAGE_BILLING: 'org:manage_billing',
  ORG_MANAGE_ROLES: 'org:manage_roles', // meta: chỉnh mapping role→permission của org
} as const

export type OrgPermissionValue = (typeof OrgPermission)[keyof typeof OrgPermission]

// Toàn bộ permission tồn tại — dùng cho OWNER (implicit-all) và validate input.
export const ALL_ORG_PERMISSIONS: OrgPermissionValue[] = Object.values(OrgPermission)

export function isValidOrgPermission(value: string): value is OrgPermissionValue {
  return (ALL_ORG_PERMISSIONS as string[]).includes(value)
}

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
