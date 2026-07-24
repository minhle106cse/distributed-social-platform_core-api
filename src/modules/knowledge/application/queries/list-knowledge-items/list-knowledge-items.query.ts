import { IQuery } from '@distributed-social-platform/shared-kernel'
import type { KnowledgeType, KnowledgeStatus } from '../../../domain/entities/knowledge-item.entity'

export class ListKnowledgeItemsQuery implements IQuery {
  readonly name = ListKnowledgeItemsQuery.name

  constructor(
    public readonly orgId: string,
    public readonly spaceId: string | undefined,
    public readonly type: KnowledgeType | undefined,
    public readonly status: KnowledgeStatus | undefined,
    public readonly limit: number,
    public readonly offset: number,
  ) {}
}
