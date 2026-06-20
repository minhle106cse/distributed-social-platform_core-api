import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { Organization } from '@/modules/tenant/domain/entities/organization.entity'
import { Membership } from '@/modules/tenant/domain/entities/membership.entity'
import { ORGANIZATION_REPOSITORY } from '@/modules/tenant/domain/repositories/organization.repository'
import type { IOrganizationRepository } from '@/modules/tenant/domain/repositories/organization.repository'
import { MEMBERSHIP_REPOSITORY } from '@/modules/tenant/domain/repositories/membership.repository'
import type { IMembershipRepository } from '@/modules/tenant/domain/repositories/membership.repository'
import { CreateOrgCommand } from './create-org.command'

@Injectable()
@CommandHandler(CreateOrgCommand)
export class CreateOrgHandler implements ICommandHandler<CreateOrgCommand> {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly orgRepo: IOrganizationRepository,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly membershipRepo: IMembershipRepository,
  ) {}

  async execute(command: CreateOrgCommand): Promise<void> {
    const existing = await this.orgRepo.findBySlug(command.slug)
    if (existing) throw new Error(`Organization slug "${command.slug}" already taken`)

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
  }
}
