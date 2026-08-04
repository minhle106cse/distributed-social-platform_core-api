import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/infrastructure/database/prisma/core-api-repos.factory'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { SpendCreditsCommand } from './spend-credits.command'

@Injectable()
@CommandHandler(SpendCreditsCommand)
export class SpendCreditsHandler implements ITransactionalCommandHandler<
  SpendCreditsCommand,
  { balance: number; spent: number },
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(
    command: SpendCreditsCommand,
    tx: CoreApiRepos,
  ): Promise<{ balance: number; spent: number }> {
    const account = await tx.creditEvents.loadOrOpen(command.orgId, command.userId)
    // Insufficient balance throws InsufficientCreditsError (409); no event is appended.
    account.spend(command.amount, command.reason)
    // OCC: concurrent spends on the same version collide → CreditConcurrencyError (409).
    await tx.creditEvents.save(account)
    return { balance: account.balance, spent: command.amount }
  }
}
