import { IQuery } from '@distributed-social-platform/shared-kernel'

export class ListBookmarksQuery implements IQuery {
  readonly name = ListBookmarksQuery.name

  constructor(
    readonly orgId: string,
    readonly userId: string,
    readonly limit: number,
    readonly offset: number,
  ) {}
}
