import { SetMetadata } from '@nestjs/common'
import type { SystemPermissionValue } from '@distributed-social-platform/shared-kernel'

export const SYSTEM_PERMISSION_KEY = 'requiredSystemPermission'

/**
 * Requires a system-level permission from the JWT's `permissions` claim
 * (auth-service's System RBAC — see JwtPayload). Unlike RequireOrgPermission,
 * this checks the token directly (no DB membership lookup) — the caller isn't
 * necessarily a member of any org, they're a platform administrator.
 */
export const RequireSystemPermission = (permission: SystemPermissionValue) =>
  SetMetadata(SYSTEM_PERMISSION_KEY, permission)
