import { Injectable } from '@nestjs/common'
import {
  CreditAwardedEvent,
  type ITransactionalCommandHandler,
} from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { MembershipNotFoundError } from '@/modules/tenant/domain/tenant.error'
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

    // The other half of the dead `credit-events` wire (Phase 5b): CREDIT_AWARDED
    // has been in the EventType vocabulary and the topic map since Phase 5a with
    // nothing emitting it. Same transaction as the ledger append — outbox, so the
    // event cannot exist without the grant that caused it, or vice versa.
    await tx.outbox.append(
      CreditAwardedEvent.create({
        aggregateId: account.aggregateId,
        orgId: command.orgId,
        payload: {
          userId: command.recipientUserId,
          amount: command.amount,
          reason: command.reason,
          balance: account.balance,
        },
      }),
    )

    return { balance: account.balance }
  }
}
