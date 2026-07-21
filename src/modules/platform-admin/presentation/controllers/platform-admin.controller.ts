import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { CommandBus, QueryBus, SystemPermission } from '@distributed-social-platform/shared-kernel'
import { JwtAuthGuard } from '@/infrastructure/http/guards/jwt-auth.guard'
import { SystemPermissionGuard } from '@/infrastructure/http/guards/system-permission.guard'
import { RequireSystemPermission } from '@/infrastructure/http/decorators/require-system-permission.decorator'
import { ZodValidationPipe } from '@/infrastructure/http/pipes/zod-validation.pipe'
import { IdempotencyInterceptor } from '@/infrastructure/http/idempotency/idempotency.interceptor'
import { ListAllOrgsQuery } from '../../application/queries/list-all-orgs/list-all-orgs.query'
import { ProvisionOrgCommand } from '../../application/commands/provision-org/provision-org.command'
import type { ProvisionOrgResult } from '../../application/commands/provision-org/provision-org.handler'
import { ProvisionOrgSchema } from '../schemas/provision-org.schema'
import type { ProvisionOrgDto } from '../schemas/provision-org.schema'

/**
 * Platform (system admin) endpoints — NOT org-scoped, no Membership required.
 * Lives in its own module (not tenant/) because these routes check the JWT's
 * system-level `permissions` claim via SystemPermissionGuard, never DB org
 * membership via OrgGuard — a different bounded context (System RBAC, dynamic
 * roles/permissions managed in auth-service) from Org RBAC (fixed per-org
 * role/permission enum, managed in tenant/).
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class PlatformAdminController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  // Onboarding entrypoint: orgs are provisioned by the platform after a
  // contract is signed, not self-service — this is the ONLY way to create an
  // org (see org.controller.ts, the old self-service POST /orgs is removed).
  // Provisions the owner's user account in auth-service (gRPC) as part of
  // the same operation — see ProvisionOrgHandler for the compensation logic
  // if org creation fails after the owner was already provisioned. Idempotent
  // via X-Idempotency-Key — this is the single highest blast-radius mutation
  // in the system (cross-service: real auth_db user + core_db org), a retried
  // client request should never risk a second provision+compensate round-trip.
  @Post('admin/orgs')
  @HttpCode(201)
  @UseGuards(SystemPermissionGuard)
  @RequireSystemPermission(SystemPermission.ORG_CREATE)
  @UseInterceptors(IdempotencyInterceptor)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async provisionOrg(
    @Body(new ZodValidationPipe(ProvisionOrgSchema)) body: ProvisionOrgDto,
  ): Promise<ProvisionOrgResult> {
    return this.commandBus.execute<ProvisionOrgCommand, ProvisionOrgResult>(
      new ProvisionOrgCommand(body.orgName, body.slug, body.ownerEmail),
    )
  }

  // SystemPermission.ORG_READ — system-level permission (JWT claim, from the
  // shared catalog in @distributed-social-platform/shared-kernel), not an org
  // permission. Checked via SystemPermissionGuard (JWT claim only), never via
  // OrgGuard (DB membership) — this endpoint lists every org, so there is no
  // single org to be a member of.
  @Get('admin/orgs')
  @UseGuards(SystemPermissionGuard)
  @RequireSystemPermission(SystemPermission.ORG_READ)
  async listAllOrgs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<unknown> {
    const take = Math.min(parseInt(limit ?? '50', 10) || 50, 100)
    const skip = parseInt(offset ?? '0', 10) || 0
    return this.queryBus.execute(new ListAllOrgsQuery(take, skip))
  }
}
