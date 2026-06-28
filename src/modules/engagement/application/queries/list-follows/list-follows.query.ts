import { IQuery } from '@distributed-social-platform/shared-kernel'

export class ListFollowsQuery implements IQuery {
  readonly name = 'ListFollowsQuery'

  constructor(
    readonly orgId: string,
    readonly userId: string,
    readonly limit: number,
    readonly offset: number,
  ) {}
}
