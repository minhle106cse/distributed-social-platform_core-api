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
import { ORG_ROLE_PERMISSION_REPOSITORY } from '@/modules/tenant/domain/repositories/org-role-permission.repository'
import type { IOrgRolePermissionRepository } from '@/modules/tenant/domain/repositories/org-role-permission.repository'
import { ALL_ORG_PERMISSIONS } from '@/common/tenant/org-permissions'
import type { OrgPermissionValue, OrgRole } from '@/common/tenant/org-permissions'

export interface OrgContext {
  orgId: string
  orgRole: OrgRole
  permissions: string[]
}

@Injectable()
export class OrgGuard implements CanActivate {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepo: IMembershipRepository,
    private readonly reflector: Reflector,
    @Inject(ORG_ROLE_PERMISSION_REPOSITORY)
    private readonly rolePermissionRepo: IOrgRolePermissionRepository,
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
    const permissions = await this.resolvePermissions(orgId, orgRole)

    request.org = { orgId, orgRole, permissions }

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

  // OWNER luôn có toàn bộ quyền (implicit) → chống lock-out, không phụ thuộc bảng mapping.
  // Các role khác: đọc mapping động từ DB (org_role_permissions).
  // TODO(Phase 3): cache kết quả vào Redis (key org_perms:{orgId}:{role}, TTL 5') + invalidate khi update.
  private async resolvePermissions(orgId: string, role: OrgRole): Promise<string[]> {
    if (role === 'OWNER') return [...ALL_ORG_PERMISSIONS]
    return this.rolePermissionRepo.findByOrgAndRole(orgId, role)
  }
}
