import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { MembershipNotFoundError } from '@/common/errors/tenant.error'
import { GrantCreditsCommand } from './grant-credits.command'

@Injectable()
@CommandHandler(GrantCreditsCommand)
export class GrantCreditsHandler implements ITransactionalCommandHandler<
  GrantCreditsCommand,
  { balance: number },
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: GrantCreditsCommand, tx: CoreApiRepos): Promise<{ balance: number }> {
    // Without this, an OWNER (who legitimately has CREDIT_GRANT permission on
    // their own org) could grant real credit to ANY uuid, including a user
    // who isn't a member of this org at all — a "ghost wallet" with no org
    // relationship backing it. OrgGuard already verified the CALLER's
    // membership; this verifies the RECIPIENT's separately, since they're not
    // the same person.
    const recipientMembership = await tx.memberships.findByOrgAndUser(
      command.orgId,
      command.recipientUserId,
    )
    if (!recipientMembership) {
      throw new MembershipNotFoundError()
    }

    const account = await tx.creditEvents.loadOrOpen(command.orgId, command.recipientUserId)
    account.grant(command.amount, command.reason)
    await tx.creditEvents.save(account)
    return { balance: account.balance }
  }
}
