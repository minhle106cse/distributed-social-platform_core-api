import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'
import type { SpaceVisibility } from '@/modules/tenant/domain/entities/space.entity'

export class CreateSpaceCommand implements ICommand {
  readonly name = 'CreateSpaceCommand'
  readonly options: CommandOptions = { transactional: false, retryable: false }

  constructor(
    public readonly orgId: string,
    public readonly spaceName: string,
    public readonly visibility: SpaceVisibility,
  ) {}
}
