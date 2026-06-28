import { IQuery } from '@distributed-social-platform/shared-kernel'

export class GetKnowledgeItemQuery implements IQuery {
  readonly name = 'GetKnowledgeItemQuery'

  constructor(
    public readonly id: string,
    public readonly orgId: string,
  ) {}
}
