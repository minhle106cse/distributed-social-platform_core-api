import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { CREDIT_EVENT_REPOSITORY } from '@/modules/credit/domain/repositories/credit-event.repository'
import type { ICreditEventRepository } from '@/modules/credit/domain/repositories/credit-event.repository'
import { RefundCreditsCommand } from './refund-credits.command'

@Injectable()
@CommandHandler(RefundCreditsCommand)
export class RefundCreditsHandler implements ICommandHandler<
  RefundCreditsCommand,
  { balance: number }
> {
  constructor(
    @Inject(CREDIT_EVENT_REPOSITORY) private readonly creditRepo: ICreditEventRepository,
  ) {}

  async execute(command: RefundCreditsCommand): Promise<{ balance: number }> {
    const account = await this.creditRepo.loadOrOpen(command.orgId, command.userId)
    account.refund(command.amount, command.reason)
    await this.creditRepo.save(account)
    return { balance: account.balance }
  }
}
