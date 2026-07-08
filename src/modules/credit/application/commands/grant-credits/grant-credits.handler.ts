import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { CREDIT_EVENT_REPOSITORY } from '@/modules/credit/domain/repositories/credit-event.repository'
import type { ICreditEventRepository } from '@/modules/credit/domain/repositories/credit-event.repository'
import { GrantCreditsCommand } from './grant-credits.command'

@Injectable()
@CommandHandler(GrantCreditsCommand)
export class GrantCreditsHandler implements ICommandHandler<
  GrantCreditsCommand,
  { balance: number }
> {
  constructor(
    @Inject(CREDIT_EVENT_REPOSITORY) private readonly creditRepo: ICreditEventRepository,
  ) {}

  async execute(command: GrantCreditsCommand): Promise<{ balance: number }> {
    const account = await this.creditRepo.loadOrOpen(command.orgId, command.recipientUserId)
    account.grant(command.amount, command.reason)
    await this.creditRepo.save(account)
    return { balance: account.balance }
  }
}
