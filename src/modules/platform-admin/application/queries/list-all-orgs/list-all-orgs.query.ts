import { IQuery } from '@distributed-social-platform/shared-kernel'

export class ListAllOrgsQuery implements IQuery {
  readonly name = ListAllOrgsQuery.name

  constructor(
    readonly limit: number,
    readonly offset: number,
  ) {}
}
