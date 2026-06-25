import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { randomUUID, randomBytes } from 'crypto'
import { CommandBus, QueryBus } from '@distributed-social-platform/shared-kernel'
import { JwtAuthGuard } from '@/infrastructure/http/guards/jwt-auth.guard'
import type { JwtPayload } from '@/infrastructure/http/guards/jwt-auth.guard'
import { OrgGuard } from '@/infrastructure/http/guards/org.guard'
import type { OrgContext } from '@/infrastructure/http/types/org-context.interface'
import { RequireOrgPermission } from '@/infrastructure/http/decorators/require-org-permission.decorator'
import { OrgPermission } from '@/modules/tenant/domain/org-permissions'
import { CurrentUser } from '@/infrastructure/http/decorators/current-user.decorator'
import { CurrentOrg } from '@/infrastructure/http/decorators/current-org.decorator'
import { ZodValidationPipe } from '@/infrastructure/http/pipes/zod-validation.pipe'
import { CreateOrgCommand } from '../../application/commands/create-org/create-org.command'
import { CreateSpaceCommand } from '../../application/commands/create-space/create-space.command'
import { UpdateMemberRoleCommand } from '../../application/commands/update-member-role/update-member-role.command'
import { UpdateRolePermissionsCommand } from '../../application/commands/update-role-permissions/update-role-permissions.command'
import { CreateInviteCommand } from '../../application/commands/create-invite/create-invite.command'
import { AcceptInviteCommand } from '../../application/commands/accept-invite/accept-invite.command'
import { GetOrgMembersQuery } from '../../application/queries/get-org-members/get-org-members.query'
import { GetRolePermissionsQuery } from '../../application/queries/get-role-permissions/get-role-permissions.query'
import {
  CreateOrgSchema,
  CreateSpaceSchema,
  UpdateMemberRoleSchema,
  ManageableOrgRoleSchema,
  UpdateRolePermissionsSchema,
  CreateInviteSchema,
  AcceptInviteSchema,
} from '../schemas/org.schema'
import type {
  CreateOrgDto,
  CreateSpaceDto,
  UpdateMemberRoleDto,
  UpdateRolePermissionsDto,
  CreateInviteDto,
  AcceptInviteDto,
} from '../schemas/org.schema'

@Controller()
@UseGuards(JwtAuthGuard)
export class OrgController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('orgs')
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 10 } }) // org creation is heavy → tighten
  async createOrg(
    @Body(new ZodValidationPipe(CreateOrgSchema)) body: CreateOrgDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const orgId = randomUUID()
    await this.commandBus.execute(
      new CreateOrgCommand(orgId, body.name, body.slug, user.sub, randomUUID()),
    )
    return { id: orgId }
  }

  @Get('orgs/:id/members')
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.ORG_MANAGE_MEMBERS)
  async getMembers(
    @CurrentOrg() org: OrgContext,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<unknown> {
    const take = Math.min(parseInt(limit ?? '50', 10) || 50, 100)
    const skip = parseInt(offset ?? '0', 10) || 0
    return this.queryBus.execute(new GetOrgMembersQuery(org.orgId, take, skip))
  }

  @Patch('orgs/:id/members/:userId')
  @HttpCode(204)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.ORG_MANAGE_MEMBERS)
  async updateMemberRole(
    @Param('userId') targetUserId: string,
    @CurrentOrg() org: OrgContext,
    @Body(new ZodValidationPipe(UpdateMemberRoleSchema)) body: UpdateMemberRoleDto,
  ) {
    await this.commandBus.execute(new UpdateMemberRoleCommand(org.orgId, targetUserId, body.role))
  }

  @Post('spaces')
  @HttpCode(201)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.ORG_MANAGE_SPACES)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async createSpace(
    @Body(new ZodValidationPipe(CreateSpaceSchema)) body: CreateSpaceDto,
    @CurrentOrg() org: OrgContext,
  ) {
    const spaceId = randomUUID()
    await this.commandBus.execute(
      new CreateSpaceCommand(spaceId, org.orgId, body.name, body.visibility),
    )
    return { id: spaceId }
  }

  // ── Invite ─────────────────────────────────────────────────────────────────

  @Post('orgs/:id/invites')
  @HttpCode(201)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.ORG_MANAGE_MEMBERS)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  async createInvite(
    @CurrentUser() user: JwtPayload,
    @CurrentOrg() org: OrgContext,
    @Body(new ZodValidationPipe(CreateInviteSchema)) body: CreateInviteDto,
  ) {
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + body.ttlHours * 60 * 60 * 1000)
    await this.commandBus.execute(
      new CreateInviteCommand(randomUUID(), token, org.orgId, body.role, user.sub, expiresAt),
    )
    return { token, expiresAt }
  }

  @Post('invites/accept')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } }) // token in body → throttle brute-force
  async acceptInvite(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(AcceptInviteSchema)) body: AcceptInviteDto,
  ): Promise<unknown> {
    return this.commandBus.execute(new AcceptInviteCommand(body.token, user.sub, randomUUID()))
  }

  // ── Org RBAC management (OWNER) ────────────────────────────────────────────

  @Get('orgs/:id/role-permissions')
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.ORG_MANAGE_ROLES)
  async getRolePermissions(@CurrentOrg() org: OrgContext): Promise<unknown> {
    return this.queryBus.execute(new GetRolePermissionsQuery(org.orgId))
  }

  @Patch('orgs/:id/role-permissions/:role')
  @HttpCode(204)
  @UseGuards(OrgGuard)
  @RequireOrgPermission(OrgPermission.ORG_MANAGE_ROLES)
  async updateRolePermissions(
    @Param('role') role: string,
    @CurrentOrg() org: OrgContext,
    @Body(new ZodValidationPipe(UpdateRolePermissionsSchema)) body: UpdateRolePermissionsDto,
  ) {
    // OWNER bị loại khỏi enum → param OWNER sẽ 400 ở đây (cũng được handler chặn lần nữa)
    const parsedRole = ManageableOrgRoleSchema.parse(role)
    await this.commandBus.execute(
      new UpdateRolePermissionsCommand(org.orgId, parsedRole, body.permissions),
    )
  }
}
