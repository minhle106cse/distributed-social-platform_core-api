import { IQuery } from '@distributed-social-platform/shared-kernel'

export class GetVoteSummaryQuery implements IQuery {
  readonly name = 'GetVoteSummaryQuery'

  constructor(
    readonly itemId: string,
    readonly orgId: string,
    readonly userId: string,
  ) {}
}
