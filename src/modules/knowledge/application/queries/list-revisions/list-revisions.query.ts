import { IQuery } from '@distributed-social-platform/shared-kernel'

export class ListRevisionsQuery implements IQuery {
  readonly name = 'ListRevisionsQuery'

  constructor(
    public readonly itemId: string,
    public readonly orgId: string,
  ) {}
}
