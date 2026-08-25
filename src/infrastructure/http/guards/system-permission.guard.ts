import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { FastifyRequest } from 'fastify'
import type { JwtPayload } from './jwt-auth.guard'
import { SYSTEM_PERMISSION_KEY } from '@/infrastructure/http/decorators/require-system-permission.decorator'
import { SystemPermissionsClient } from '@/infrastructure/grpc/system-permissions.client'
import type { SystemPermissionValue } from '@distributed-social-platform/shared-kernel'

/**
 * Platform-admin authorization. Resolves the caller's system permissions from
 * auth_db over gRPC (cached in Redis, 30s) — it does NOT read the JWT's
 * `permissions` claim.
 *
 * ⚠️ WHY NOT THE TOKEN CLAIM (changed 2026-08-25). The claim is a snapshot taken
 * at login, so revoking SUPER_ADMIN left the old token fully privileged for the
 * rest of its 15-minute life, and the only lever was to shorten every token in
 * the system. Org RBAC never had this problem: OrgGuard resolves from the DB per
 * request. This closes the same gap for the system tier — the asymmetry was
 * already recorded as a root cause in `.ai/memory/gotchas.jsonl` ("any
 * implicit-all / role-shortcut design that lives only in a JWT-claim-checking
 * guard MUST be expanded at token-mint time, not assumed"). auth-service still
 * puts `permissions` in the token for its OWN `requirePermissions`; core-api
 * simply no longer trusts it.
 *
 * Costs: a dependency on auth-service for admin routes, and a gRPC hop. The hop
 * is absorbed by the cache; the dependency FAILS CLOSED (503), because an authz
 * check that degrades to "allow" when its source is unreachable is worse than
 * no check at all — same rule as RemoteOrgMembershipGuard.
 *
 * ⚠️ ALSO FAIL-CLOSED ON A MISSING DECLARATION. A route this guard protects but
 * that declares no @RequireSystemPermission is REJECTED, not allowed. This tier
 * has no floor to fall back to: OrgGuard proves DB membership before it even
 * looks at the decorator, so forgetting it there degrades to "any member";
 * forgetting it here used to degrade to "any authenticated user", i.e. an
 * ordinary org member reaching a platform-admin route. `getAllAndOverride` (not
 * `.get`) because a decorator placed on the CLASS otherwise reads as
 * "not declared" — silently.
 *
 * Variadic + AND (2026-08-25), matching RemoteOrgMembershipGuard: several
 * declared permissions means the caller needs ALL of them. `@RequireSystemPermission()`
 * with zero arguments is treated the same as no decorator at all — an empty
 * requirement isn't a real requirement, and silently admitting the route would
 * reopen the exact "missing declaration ⇒ allow" hole this guard exists to close.
 */
@Injectable()
export class SystemPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsClient: SystemPermissionsClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: JwtPayload }>()

    const requiredPermissions = this.reflector.getAllAndOverride<SystemPermissionValue[]>(
      SYSTEM_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    )
    if (!requiredPermissions || requiredPermissions.length === 0) {
      throw new ForbiddenException(
        'Route is missing @RequireSystemPermission — refusing to serve it unguarded',
      )
    }

    const userId = request.user?.sub
    if (!userId) throw new UnauthorizedException()

    let permissions: string[]
    try {
      permissions = await this.permissionsClient.resolvePermissions(userId)
    } catch {
      throw new ServiceUnavailableException('Unable to verify system permissions')
    }

    // AND, không phải OR — khai báo nhiều permission nghĩa là cần đủ cả, giống
    // RemoteOrgMembershipGuard.
    const missing = requiredPermissions.filter((p) => !permissions.includes(p))
    if (missing.length > 0) {
      throw new ForbiddenException(`Missing system permission: ${missing.join(', ')}`)
    }

    return true
  }
}
