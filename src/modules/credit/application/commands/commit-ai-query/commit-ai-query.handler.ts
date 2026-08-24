import { Injectable } from '@nestjs/common'
import {
  CreditSpentEvent,
  type ITransactionalCommandHandler,
} from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { CommitAiQueryCommand } from './commit-ai-query.command'

export interface CommitAiQueryResult {
  aiQueryId: string
  balance: number
}

@Injectable()
@CommandHandler(CommitAiQueryCommand)
export class CommitAiQueryHandler implements ITransactionalCommandHandler<
  CommitAiQueryCommand,
  CommitAiQueryResult,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: CommitAiQueryCommand, tx: CoreApiRepos): Promise<CommitAiQueryResult> {
    const account = await tx.creditEvents.loadOrOpen(command.orgId, command.userId)
    // Throws ReservationNotOpenError if the hold is gone (expired and swept, or
    // already released) — correct: the answer must not be charged for twice, and
    // the saga surfaces the failure rather than silently double-billing.
    account.commitReservation(command.reservationId, command.reason)
    await tx.creditEvents.save(account)

    const aiQueryId = await tx.aiQueries.record({
      orgId: command.orgId,
      userId: command.userId,
      question: command.question,
      answer: command.answer,
      sources: command.sources,
      creditCost: command.amount,
      status: 'ANSWERED',
      reservationId: command.reservationId,
    })

    // Closes the `credit-events` wire, declared in shared-kernel since Phase 5a
    // but never emitted by anyone until now.
    await tx.outbox.append(
      CreditSpentEvent.create({
        aggregateId: account.aggregateId,
        orgId: command.orgId,
        payload: {
          userId: command.userId,
          amount: command.amount,
          reason: command.reason,
          balance: account.balance,
          reservationId: command.reservationId,
          aiQueryId,
        },
      }),
    )

    return { aiQueryId, balance: account.balance }
  }
}
