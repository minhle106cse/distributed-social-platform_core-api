import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { FastifyRequest } from 'fastify'
import type { JwtPayload } from './jwt-auth.guard'
import { ORG_PERMISSION_KEY } from '@/infrastructure/http/decorators/require-org-permission.decorator'
import { MEMBERSHIP_REPOSITORY } from '@/modules/tenant/domain/repositories/membership.repository'
import type { IMembershipRepository } from '@/modules/tenant/domain/repositories/membership.repository'
import { OrgPermissionResolver } from '@/modules/tenant/domain/services/resolve-org-permissions'
import type { OrgPermissionValue } from '@distributed-social-platform/shared-kernel'
import type { OrgContext } from '@/infrastructure/http/types/org-context.interface'
import { setTenantId } from '@/common/tenant/tenant.context'

@Injectable()
export class OrgGuard implements CanActivate {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepo: IMembershipRepository,
    private readonly reflector: Reflector,
    private readonly permissionResolver: OrgPermissionResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: JwtPayload; org?: OrgContext }>()

    const userId = request.user?.sub
    if (!userId) throw new UnauthorizedException()

    const orgId = request.headers['x-org-id'] as string | undefined
    if (!orgId) throw new ForbiddenException('X-Org-Id header is required')

    const membership = await this.membershipRepo.findByOrgAndUser(orgId, userId)
    if (!membership) throw new ForbiddenException('You are not a member of this organization')

    const orgRole = membership.role
    const permissions = await this.permissionResolver.resolve(orgId, orgRole)

    request.org = { orgId, orgRole, permissions }
    // Đưa orgId (đã xác thực) vào AsyncLocalStorage cho repo đọc qua getTenantId().
    setTenantId(orgId)

    // Nếu route khai báo @RequireOrgPermission, kiểm tra theo action (không theo role name)
    const requiredPermission = this.reflector.get<OrgPermissionValue>(
      ORG_PERMISSION_KEY,
      context.getHandler(),
    )
    if (requiredPermission && !permissions.includes(requiredPermission)) {
      throw new ForbiddenException(`Missing permission: ${requiredPermission}`)
    }

    return true
  }
}
