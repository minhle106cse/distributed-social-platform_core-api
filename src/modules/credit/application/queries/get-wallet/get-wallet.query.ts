import { IQuery } from '@distributed-social-platform/shared-kernel'

export class GetWalletQuery implements IQuery {
  readonly name = GetWalletQuery.name

  constructor(
    public readonly orgId: string,
    public readonly userId: string,
  ) {}
}
