import { ICommand } from '@distributed-social-platform/shared-kernel'

/**
 * Step 3 of the AI-Query Saga, and deliberately ONE command rather than two
 * dispatches: committing the reservation, storing the answer and appending the
 * `CreditSpent` outbox row must be atomic. Split across two transactional
 * commands, the second one failing would leave a charged wallet with no record
 * of what it paid for — and would need a compensation of its own, inside a saga
 * whose compensation stack is already unwinding.
 */
export class CommitAiQueryCommand implements ICommand {
  readonly name = CommitAiQueryCommand.name

  constructor(
    public readonly orgId: string,
    public readonly userId: string,
    public readonly reservationId: string,
    public readonly question: string,
    public readonly answer: string,
    public readonly sources: Array<{ knowledgeItemId: string; title: string }>,
    public readonly amount: number,
    public readonly reason: string,
  ) {}
}
