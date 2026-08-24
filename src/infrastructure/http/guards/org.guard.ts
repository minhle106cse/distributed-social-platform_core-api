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
import { MEMBERSHIP_QUERY_REPOSITORY } from '@/modules/tenant/application/repositories/membership.query-repository'
import type { IMembershipQueryRepository } from '@/modules/tenant/application/repositories/membership.query-repository'
import { OrgPermissionResolver } from '@/modules/tenant/domain/services/org-permission-resolver'
import type { OrgPermissionValue } from '@distributed-social-platform/shared-kernel'
import type { OrgContext } from '@/infrastructure/http/types/org-context.interface'
import { setTenantId } from '@/common/tenant/tenant.context'

@Injectable()
export class OrgGuard implements CanActivate {
  constructor(
    // Read side: a guard runs before the handler that would open a transaction,
    // so it cannot reach the write repository (ADR-0001).
    @Inject(MEMBERSHIP_QUERY_REPOSITORY)
    private readonly membershipQueryRepo: IMembershipQueryRepository,
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

    const orgRole = await this.membershipQueryRepo.findRoleByOrgAndUser(orgId, userId)
    if (!orgRole) throw new ForbiddenException('You are not a member of this organization')

    const permissions = await this.permissionResolver.resolve(orgId, orgRole)

    request.org = { orgId, orgRole, permissions }
    // Đưa orgId (đã xác thực) vào AsyncLocalStorage cho repo đọc qua getTenantId().
    setTenantId(orgId)

    // Nếu route khai báo @RequireOrgPermission, kiểm tra theo action (không theo role name)
    const requiredPermissions = this.reflector.get<OrgPermissionValue[]>(
      ORG_PERMISSION_KEY,
      context.getHandler(),
    )
    // AND, không phải OR — route khai báo nhiều permission nghĩa là cần đủ cả.
    const missing = requiredPermissions?.filter((p) => !permissions.includes(p)) ?? []
    if (missing.length > 0) {
      throw new ForbiddenException(`Missing permission: ${missing.join(', ')}`)
    }

    return true
  }
}
