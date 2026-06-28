import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class CreateOrgCommand implements ICommand {
  readonly name = 'CreateOrgCommand'
  readonly options: CommandOptions = { transactional: true, retryable: false }

  constructor(
    public readonly orgName: string,
    public readonly slug: string,
    public readonly ownerUserId: string,
  ) {}
}
