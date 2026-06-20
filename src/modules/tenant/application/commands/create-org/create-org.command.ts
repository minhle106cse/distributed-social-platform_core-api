import { ICommand } from '@distributed-social-platform/shared-kernel'

export class CreateOrgCommand implements ICommand {
  readonly name = 'CreateOrgCommand'

  constructor(
    public readonly id: string,
    public readonly orgName: string,
    public readonly slug: string,
    public readonly ownerUserId: string,
    public readonly ownerId: string,
    public readonly options = { transactional: true, retryable: false },
  ) {}
}
