import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { CREDIT_EVENT_REPOSITORY } from '@/modules/credit/domain/repositories/credit-event.repository'
import type { ICreditEventRepository } from '@/modules/credit/domain/repositories/credit-event.repository'
import { SpendCreditsCommand } from './spend-credits.command'

@Injectable()
@CommandHandler(SpendCreditsCommand)
export class SpendCreditsHandler implements ICommandHandler<
  SpendCreditsCommand,
  { balance: number; spent: number }
> {
  constructor(
    @Inject(CREDIT_EVENT_REPOSITORY) private readonly creditRepo: ICreditEventRepository,
  ) {}

  async execute(command: SpendCreditsCommand): Promise<{ balance: number; spent: number }> {
    const account = await this.creditRepo.loadOrOpen(command.orgId, command.userId)
    // Insufficient balance throws InsufficientCreditsError (409); no event is appended.
    account.spend(command.amount, command.reason)
    // OCC: concurrent spends on the same version collide → CreditConcurrencyError (409).
    await this.creditRepo.save(account)
    return { balance: account.balance, spent: command.amount }
  }
}
