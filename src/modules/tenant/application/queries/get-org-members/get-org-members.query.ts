import { IQuery } from '@distributed-social-platform/shared-kernel'

export class GetOrgMembersQuery implements IQuery {
  readonly name = GetOrgMembersQuery.name

  constructor(
    public readonly orgId: string,
    public readonly limit: number = 50,
    public readonly offset: number = 0,
  ) {}
}
