import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { OrgNotFoundError } from '@/common/errors/tenant.error'
import { ArchiveOrgCommand } from './archive-org.command'

@Injectable()
@CommandHandler(ArchiveOrgCommand)
export class ArchiveOrgHandler implements ITransactionalCommandHandler<
  ArchiveOrgCommand,
  void,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: ArchiveOrgCommand, tx: CoreApiRepos): Promise<void> {
    const org = await tx.organizations.findById(command.orgId)
    if (!org) throw new OrgNotFoundError()

    org.softDelete()
    await tx.organizations.save(org)
  }
}
