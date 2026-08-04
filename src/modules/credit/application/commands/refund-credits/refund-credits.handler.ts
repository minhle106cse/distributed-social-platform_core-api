import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/infrastructure/database/prisma/core-api-repos.factory'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { RefundCreditsCommand } from './refund-credits.command'

@Injectable()
@CommandHandler(RefundCreditsCommand)
export class RefundCreditsHandler implements ITransactionalCommandHandler<
  RefundCreditsCommand,
  { balance: number },
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: RefundCreditsCommand, tx: CoreApiRepos): Promise<{ balance: number }> {
    const account = await tx.creditEvents.loadOrOpen(command.orgId, command.userId)
    account.refund(command.amount, command.reason)
    await tx.creditEvents.save(account)
    return { balance: account.balance }
  }
}
