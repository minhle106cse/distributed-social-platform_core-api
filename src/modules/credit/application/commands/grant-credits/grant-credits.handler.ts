import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { CREDIT_EVENT_REPOSITORY } from '@/modules/credit/domain/repositories/credit-event.repository'
import type { ICreditEventRepository } from '@/modules/credit/domain/repositories/credit-event.repository'
import { MEMBERSHIP_REPOSITORY } from '@/modules/tenant/domain/repositories/membership.repository'
import type { IMembershipRepository } from '@/modules/tenant/domain/repositories/membership.repository'
import { MembershipNotFoundError } from '@/common/errors/tenant.error'
import { GrantCreditsCommand } from './grant-credits.command'

@Injectable()
@CommandHandler(GrantCreditsCommand)
export class GrantCreditsHandler implements ICommandHandler<
  GrantCreditsCommand,
  { balance: number }
> {
  constructor(
    @Inject(CREDIT_EVENT_REPOSITORY) private readonly creditRepo: ICreditEventRepository,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly membershipRepo: IMembershipRepository,
  ) {}

  async execute(command: GrantCreditsCommand): Promise<{ balance: number }> {
    // Without this, an OWNER (who legitimately has CREDIT_GRANT permission on
    // their own org) could grant real credit to ANY uuid, including a user
    // who isn't a member of this org at all — a "ghost wallet" with no org
    // relationship backing it. OrgGuard already verified the CALLER's
    // membership; this verifies the RECIPIENT's separately, since they're not
    // the same person.
    const recipientMembership = await this.membershipRepo.findByOrgAndUser(
      command.orgId,
      command.recipientUserId,
    )
    if (!recipientMembership) {
      throw new MembershipNotFoundError()
    }

    const account = await this.creditRepo.loadOrOpen(command.orgId, command.recipientUserId)
    account.grant(command.amount, command.reason)
    await this.creditRepo.save(account)
    return { balance: account.balance }
  }
}
