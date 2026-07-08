import { IQuery } from '@distributed-social-platform/shared-kernel'

export class GetRolePermissionsQuery implements IQuery {
  readonly name = GetRolePermissionsQuery.name

  constructor(public readonly orgId: string) {}
}
