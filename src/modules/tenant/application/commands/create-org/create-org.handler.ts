import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { Organization } from '@/modules/tenant/domain/entities/organization.entity'
import { Membership } from '@/modules/tenant/domain/entities/membership.entity'
import { ORGANIZATION_REPOSITORY } from '@/modules/tenant/domain/repositories/organization.repository'
import type { IOrganizationRepository } from '@/modules/tenant/domain/repositories/organization.repository'
import { MEMBERSHIP_REPOSITORY } from '@/modules/tenant/domain/repositories/membership.repository'
import type { IMembershipRepository } from '@/modules/tenant/domain/repositories/membership.repository'
import { ORG_ROLE_PERMISSION_REPOSITORY } from '@/modules/tenant/domain/repositories/org-role-permission.repository'
import type { IOrgRolePermissionRepository } from '@/modules/tenant/domain/repositories/org-role-permission.repository'
import { OrgSlugAlreadyTakenError } from '@/common/errors/tenant.error'
import { CreateOrgCommand } from './create-org.command'

@Injectable()
@CommandHandler(CreateOrgCommand)
export class CreateOrgHandler implements ICommandHandler<CreateOrgCommand> {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly orgRepo: IOrganizationRepository,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly membershipRepo: IMembershipRepository,
    @Inject(ORG_ROLE_PERMISSION_REPOSITORY)
    private readonly rolePermissionRepo: IOrgRolePermissionRepository,
  ) {}

  async execute(command: CreateOrgCommand): Promise<void> {
    const existing = await this.orgRepo.findBySlug(command.slug)
    if (existing) throw new OrgSlugAlreadyTakenError(command.slug)

    const org = Organization.create({
      id: command.id,
      name: command.orgName,
      slug: command.slug,
    })

    const ownerMembership = Membership.create({
      id: command.ownerId,
      orgId: command.id,
      userId: command.ownerUserId,
      role: 'OWNER',
    })

    await this.orgRepo.save(org)
    await this.membershipRepo.save(ownerMembership)
    // Seed default role→permission mapping cho ADMIN/MEMBER/GUEST.
    // OWNER không cần seed — OrgGuard cấp toàn bộ quyền cho OWNER (implicit).
    await this.rolePermissionRepo.seedDefaults(command.id)
  }
}
