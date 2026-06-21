import type { OrgRole } from '@/common/tenant/org-permissions'

export interface OrgRolePermissionEntry {
  role: OrgRole
  permission: string
}

export interface IOrgRolePermissionRepository {
  /** Seed default mapping cho ADMIN/MEMBER/GUEST khi tạo org. */
  seedDefaults(orgId: string): Promise<void>
  /** Thay thế toàn bộ tập permission của một role trong org. */
  replaceForRole(orgId: string, role: OrgRole, permissions: string[]): Promise<void>
  /** Đọc toàn bộ mapping của org (mọi role). */
  findByOrg(orgId: string): Promise<OrgRolePermissionEntry[]>
  /** Đọc permission của một role cụ thể (dùng khi resolve trong guard). */
  findByOrgAndRole(orgId: string, role: OrgRole): Promise<string[]>
}

export const ORG_ROLE_PERMISSION_REPOSITORY = Symbol('IOrgRolePermissionRepository')
