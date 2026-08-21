import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { Organization } from '@/modules/tenant/domain/entities/organization.entity'
import { Membership } from '@/modules/tenant/domain/entities/membership.entity'
import { OrgSlugAlreadyTakenError } from '@/common/errors/tenant.error'
import { CreateOrgCommand } from './create-org.command'

@Injectable()
@CommandHandler(CreateOrgCommand)
export class CreateOrgHandler implements ITransactionalCommandHandler<
  CreateOrgCommand,
  string,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: CreateOrgCommand, tx: CoreApiRepos): Promise<string> {
    const existing = await tx.organizations.findBySlug(command.slug)
    if (existing) throw new OrgSlugAlreadyTakenError(command.slug)

    // Entity tự sinh id (v7) — KHÔNG nhận id từ caller. org.id là nguồn duy nhất.
    const org = Organization.create({
      name: command.orgName,
      slug: command.slug,
    })

    const ownerMembership = Membership.createOwner({
      orgId: org.id,
      userId: command.ownerUserId,
    })

    await tx.organizations.save(org)
    await tx.memberships.save(ownerMembership)
    // Seed default role→permission mapping cho ADMIN/MEMBER/GUEST.
    // OWNER không cần seed — OrgGuard cấp toàn bộ quyền cho OWNER (implicit).
    await tx.rolePermissions.seedDefaults(org.id)

    return org.id
  }
}
