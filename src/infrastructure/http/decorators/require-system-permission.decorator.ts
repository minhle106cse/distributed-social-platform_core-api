import { SetMetadata } from '@nestjs/common'
import type { SystemPermissionValue } from '@distributed-social-platform/shared-kernel'

export const SYSTEM_PERMISSION_KEY = 'requiredSystemPermission'

/**
 * Requires system-level permission(s), resolved from auth_db over gRPC and
 * cached in Redis (see SystemPermissionGuard) — NOT read from the JWT's
 * `permissions` claim. The caller isn't necessarily a member of any org,
 * they're a platform administrator.
 *
 * Variadic, matching RequireOrgPermission's shape (2026-08-25): several
 * permissions = AND, never OR. No system-tier route needs more than one
 * today, but the two decorators used to diverge in shape for no real reason
 * — RequireOrgPermission had already learned it needed AND (POST /ai/ask:
 * KNOWLEDGE_READ + CREDIT_SPEND) while this one stayed single-permission by
 * accident, not by decision. Keeping them the same shape means a future
 * multi-permission admin route doesn't require redesigning this decorator
 * and its guard under time pressure.
 */
export const RequireSystemPermission = (...permissions: SystemPermissionValue[]) =>
  SetMetadata(SYSTEM_PERMISSION_KEY, permissions)
