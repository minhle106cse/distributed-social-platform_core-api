import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { FastifyRequest } from 'fastify'
import type { JwtPayload } from './jwt-auth.guard'
import { SYSTEM_PERMISSION_KEY } from '@/infrastructure/http/decorators/require-system-permission.decorator'
import type { SystemPermissionValue } from '@distributed-social-platform/shared-kernel'

/**
 * Checks the JWT's system-level `permissions` claim directly — no DB lookup,
 * no org membership. Runs AFTER JwtAuthGuard (which sets request.user).
 * This is the platform-admin analogue of OrgGuard (which checks a DB
 * Membership row instead — a caller here isn't necessarily in any org).
 */
@Injectable()
export class SystemPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: JwtPayload }>()

    const requiredPermission = this.reflector.get<SystemPermissionValue>(
      SYSTEM_PERMISSION_KEY,
      context.getHandler(),
    )
    if (!requiredPermission) return true

    const permissions = request.user?.permissions ?? []
    if (!permissions.includes(requiredPermission)) {
      throw new ForbiddenException(`Missing system permission: ${requiredPermission}`)
    }

    return true
  }
}
