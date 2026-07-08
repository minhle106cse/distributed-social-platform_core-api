import { IQuery } from '@distributed-social-platform/shared-kernel'

export class ListMyOrgsQuery implements IQuery {
  readonly name = ListMyOrgsQuery.name

  constructor(readonly userId: string) {}
}
