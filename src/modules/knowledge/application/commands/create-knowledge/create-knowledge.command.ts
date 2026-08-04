import { ICommand } from '@distributed-social-platform/shared-kernel'
import type { KnowledgeType } from '@/modules/knowledge/domain/entities/knowledge-item.entity'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// idempotency-key: interceptor on POST /knowledge — no natural key stops a duplicate document,
// and a retry would re-trigger embedding fan-out. none: two different docs with the same title
// is an accepted outcome (no unique constraint to add).
export class CreateKnowledgeCommand implements ICommand {
  readonly name = CreateKnowledgeCommand.name

  constructor(
    public readonly orgId: string,
    public readonly spaceId: string,
    public readonly type: KnowledgeType,
    public readonly title: string,
    public readonly body: string,
    public readonly parentId: string | null,
    public readonly createdByUserId: string,
  ) {}
}
