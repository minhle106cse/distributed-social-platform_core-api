import { IQuery } from '@distributed-social-platform/shared-kernel'

export class ListAiQueriesQuery implements IQuery {
  readonly name = ListAiQueriesQuery.name

  constructor(
    public readonly orgId: string,
    public readonly userId: string,
  ) {}
}
