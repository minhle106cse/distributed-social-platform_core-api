import { IQuery } from '@distributed-social-platform/shared-kernel'

export class ListKnowledgeItemsQuery implements IQuery {
  readonly name = 'ListKnowledgeItemsQuery'

  constructor(
    public readonly orgId: string,
    public readonly spaceId: string | undefined,
    public readonly type: string | undefined,
    public readonly status: string | undefined,
    public readonly limit: number,
    public readonly offset: number,
  ) {}
}
