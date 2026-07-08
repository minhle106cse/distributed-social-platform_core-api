import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

// Internal compensation command — not exposed publicly in 5a.
// The AI-Query Saga (5b) dispatches this to roll back a spend when RAG fails.
export class RefundCreditsCommand implements ICommand {
  readonly name = RefundCreditsCommand.name
  readonly options: CommandOptions = { transactional: true, retryable: false }

  constructor(
    public readonly orgId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly reason: string,
  ) {}
}
