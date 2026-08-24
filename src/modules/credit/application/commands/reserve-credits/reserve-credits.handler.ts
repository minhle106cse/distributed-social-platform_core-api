import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { ReserveCreditsCommand } from './reserve-credits.command'

@Injectable()
@CommandHandler(ReserveCreditsCommand)
export class ReserveCreditsHandler implements ITransactionalCommandHandler<
  ReserveCreditsCommand,
  { available: number },
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: ReserveCreditsCommand, tx: CoreApiRepos): Promise<{ available: number }> {
    const account = await tx.creditEvents.loadOrOpen(command.orgId, command.userId)
    // Compares against AVAILABLE, so a second concurrent AI query cannot reserve
    // credits the first one is already holding. Throws InsufficientCreditsError
    // (402) — before any compensation is registered, so nothing has to be undone.
    account.reserve(command.reservationId, command.amount, command.reason)
    await tx.creditEvents.save(account)
    return { available: account.available }
  }
}
