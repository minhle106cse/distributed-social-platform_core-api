// OrgRole sống ở domain entity — import local + re-export để consumers không cần đổi import path.
import type { OrgRole } from '@/modules/tenant/domain/entities/membership.entity'
export type { OrgRole }

// ── Permission Catalog (code = source of truth) ──────────────────────────────
// Mỗi permission gắn với một feature/endpoint cụ thể. Thêm permission = thêm code.
// "Ai có permission nào" (mapping role→permission) lưu trong DB org_role_permissions.
export const OrgPermission = {
  // Knowledge
  KNOWLEDGE_READ: 'knowledge:read',
  KNOWLEDGE_WRITE: 'knowledge:write',
  KNOWLEDGE_VERIFY: 'knowledge:verify',

  // AI
  AI_QUERY: 'ai:query',

  // Org management
  ORG_MANAGE_MEMBERS: 'org:manage_members',
  ORG_MANAGE_SPACES: 'org:manage_spaces',
  ORG_MANAGE_BILLING: 'org:manage_billing',
  ORG_MANAGE_ROLES: 'org:manage_roles', // meta: chỉnh mapping role→permission của org
} as const

export type OrgPermissionValue = typeof OrgPermission[keyof typeof OrgPermission]

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
    OrgPermission.AI_QUERY,
    OrgPermission.ORG_MANAGE_MEMBERS,
    OrgPermission.ORG_MANAGE_SPACES,
  ],
  MEMBER: [
    OrgPermission.KNOWLEDGE_READ,
    OrgPermission.KNOWLEDGE_WRITE,
    OrgPermission.AI_QUERY,
  ],
  GUEST: [
    OrgPermission.KNOWLEDGE_READ,
  ],
}
