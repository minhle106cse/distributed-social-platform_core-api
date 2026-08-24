import { Injectable } from '@nestjs/common'
import {
  CreditReservationReleasedEvent,
  type ITransactionalCommandHandler,
} from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { ReleaseCreditReservationCommand } from './release-credit-reservation.command'

// Enough to render a notification without shipping a whole document through Kafka.
const QUESTION_SNIPPET_MAX = 140

export interface ReleaseCreditReservationResult {
  released: boolean
  /** Wallet balance after the release — unchanged by design, the hold was never a charge. */
  balance: number
  /** The FAILED AiQuery row written by this release; null when it was a no-op. */
  aiQueryId: string | null
}

@Injectable()
@CommandHandler(ReleaseCreditReservationCommand)
export class ReleaseCreditReservationHandler implements ITransactionalCommandHandler<
  ReleaseCreditReservationCommand,
  ReleaseCreditReservationResult,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(
    command: ReleaseCreditReservationCommand,
    tx: CoreApiRepos,
  ): Promise<ReleaseCreditReservationResult> {
    const account = await tx.creditEvents.loadOrOpen(command.orgId, command.userId)
    const released = account.releaseReservation(command.reservationId, command.reason)

    // Everything below is guarded by this, not just the ledger write. A retried
    // compensation landing on an already-COMMITTED reservation must not overwrite
    // that run's ANSWERED AiQuery row with a FAILED one, and must not emit a
    // second "you were not charged" event for a query the user WAS charged for.
    if (!released) return { released: false, balance: account.balance, aiQueryId: null }

    await tx.creditEvents.save(account)

    const aiQueryId = await tx.aiQueries.record({
      orgId: command.orgId,
      userId: command.userId,
      question: command.question,
      answer: null,
      sources: [],
      // Zero, and this is the whole point of two-phase reserve: the hold was
      // never a charge, so there is nothing to show as cost.
      creditCost: 0,
      status: 'FAILED',
      reservationId: command.reservationId,
    })

    // Emitted for every release reason, including the benign ones — this is a
    // ledger fact, not a UX decision. Which reasons deserve a user-visible
    // notification is the consumer's call (notification-service reads
    // `payload.reason`), so a new reason never needs a producer change.
    await tx.outbox.append(
      CreditReservationReleasedEvent.create({
        aggregateId: account.aggregateId,
        orgId: command.orgId,
        payload: {
          userId: command.userId,
          amount: account.reservationAmount(command.reservationId) ?? 0,
          reservationId: command.reservationId,
          aiQueryId,
          reason: command.reason,
          questionSnippet: command.question.slice(0, QUESTION_SNIPPET_MAX),
        },
      }),
    )

    return { released: true, balance: account.balance, aiQueryId }
  }
}
