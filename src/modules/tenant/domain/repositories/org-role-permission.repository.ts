import type { OrgRole } from '../org-rbac'

export interface OrgRolePermissionEntry {
  role: OrgRole
  permission: string
}

/**
 * READ port. Lives in domain/ (not application/queries/) on purpose: the domain
 * service `OrgPermissionResolver` depends on it, and domain must not import from
 * application. Its consumers — OrgGuard and the query handlers — all run OUTSIDE a
 * transaction, which is why this is separate from the write repository, which
 * since ADR-0001 only exists inside a TxScope.
 */
export interface IOrgRolePermissionReader {
  /** Whole mapping for an org (every role). */
  findByOrg(orgId: string): Promise<OrgRolePermissionEntry[]>
  /** Permissions of one role — the guard's hot path. */
  findByOrgAndRole(orgId: string, role: OrgRole): Promise<string[]>
}

/** WRITE port — reachable only through CoreApiRepos. Extends the reader so a
 *  command can read its own uncommitted state inside the same transaction. */
export interface IOrgRolePermissionRepository extends IOrgRolePermissionReader {
  /** Seed default mapping cho ADMIN/MEMBER/GUEST khi tạo org. */
  seedDefaults(orgId: string): Promise<void>
  /** Thay thế toàn bộ tập permission của một role trong org. */
  replaceForRole(orgId: string, role: OrgRole, permissions: string[]): Promise<void>
}

export const ORG_ROLE_PERMISSION_READER = Symbol('IOrgRolePermissionReader')
