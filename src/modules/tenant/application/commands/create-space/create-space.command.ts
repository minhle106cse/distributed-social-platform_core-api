import { ICommand } from '@distributed-social-platform/shared-kernel'
import type { SpaceVisibility } from '@/modules/tenant/domain/entities/space.entity'

export class CreateSpaceCommand implements ICommand {
  readonly name = 'CreateSpaceCommand'

  constructor(
    public readonly id: string,
    public readonly orgId: string,
    public readonly spaceName: string,
    public readonly visibility: SpaceVisibility,
    public readonly options = { transactional: true, retryable: false },
  ) {}
}
