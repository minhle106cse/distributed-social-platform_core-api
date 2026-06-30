import { IQuery } from '@distributed-social-platform/shared-kernel'

export class GetFeedQuery implements IQuery {
  readonly name = 'GetFeedQuery'

  constructor(
    public readonly orgId: string,
    public readonly userId: string,
    public readonly limit: number,
    public readonly offset: number,
  ) {}
}
