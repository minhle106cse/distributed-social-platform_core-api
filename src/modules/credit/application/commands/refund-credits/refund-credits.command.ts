import { ICommand } from '@distributed-social-platform/shared-kernel'

// Internal compensation command — not exposed publicly in 5a.
// The AI-Query Saga (5b) dispatches this to roll back a spend when RAG fails.
// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// none: Phase 5b saga primitive — not exposed over HTTP yet, so no idempotency-key interceptor.
// When wired into the AI-query saga it MUST gain one. occ: repo.save catches P2002 on version.
export class RefundCreditsCommand implements ICommand {
  readonly name = RefundCreditsCommand.name

  constructor(
    public readonly orgId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly reason: string,
  ) {}
}
