import {
  Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards, BadRequestException,
} from '@nestjs/common'
import { randomUUID } from 'crypto'
import { CommandBus, QueryBus } from '@distributed-social-platform/shared-kernel'
import { JwtAuthGuard } from '@/infrastructure/http/guards/jwt-auth.guard'
import type { JwtPayload } from '@/infrastructure/http/guards/jwt-auth.guard'
import { CurrentUser } from '@/infrastructure/http/decorators/current-user.decorator'
import { ZodValidationPipe } from '@/infrastructure/http/pipes/zod-validation.pipe'
import { CreateOrgCommand } from '../../application/commands/create-org/create-org.command'
import { CreateSpaceCommand } from '../../application/commands/create-space/create-space.command'
import { UpdateMemberRoleCommand } from '../../application/commands/update-member-role/update-member-role.command'
import { GetOrgMembersQuery } from '../../application/queries/get-org-members/get-org-members.query'
import {
  CreateOrgSchema, CreateSpaceSchema, UpdateMemberRoleSchema,
} from '../schemas/org.schema'
import type { CreateOrgDto, CreateSpaceDto, UpdateMemberRoleDto } from '../schemas/org.schema'

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class OrgController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('orgs')
  @HttpCode(201)
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
  async getMembers(
    @Param('id') orgId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const take = Math.min(parseInt(limit ?? '50', 10) || 50, 100)
    const skip = parseInt(offset ?? '0', 10) || 0
    return this.queryBus.execute(new GetOrgMembersQuery(orgId, take, skip))
  }

  @Patch('orgs/:id/members/:userId')
  @HttpCode(204)
  async updateMemberRole(
    @Param('id') orgId: string,
    @Param('userId') targetUserId: string,
    @Body(new ZodValidationPipe(UpdateMemberRoleSchema)) body: UpdateMemberRoleDto,
  ) {
    await this.commandBus.execute(
      new UpdateMemberRoleCommand(orgId, targetUserId, body.role),
    )
  }

  @Post('spaces')
  @HttpCode(201)
  async createSpace(
    @Body(new ZodValidationPipe(CreateSpaceSchema)) body: CreateSpaceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!user.orgId) throw new BadRequestException('orgId missing from token')

    const spaceId = randomUUID()
    await this.commandBus.execute(
      new CreateSpaceCommand(spaceId, user.orgId, body.name, body.visibility),
    )
    return { id: spaceId }
  }
}
