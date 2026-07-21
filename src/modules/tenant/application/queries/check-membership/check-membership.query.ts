import { IQuery } from '@distributed-social-platform/shared-kernel'

export class CheckMembershipQuery implements IQuery {
  readonly name = CheckMembershipQuery.name

  constructor(
    public readonly orgId: string,
    public readonly userId: string,
  ) {}
}
