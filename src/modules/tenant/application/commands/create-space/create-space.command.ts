import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'
import type { SpaceVisibility } from '@/modules/tenant/domain/entities/space.entity'

export class CreateSpaceCommand implements ICommand {
  readonly name = CreateSpaceCommand.name
  readonly options: CommandOptions = {
    transactional: false,
    // idempotency-key: interceptor on POST /spaces — no natural key stops a duplicate space.
    // none: two spaces with the same name from two distinct requests is an accepted outcome.
  }

  constructor(
    public readonly orgId: string,
    public readonly spaceName: string,
    public readonly visibility: SpaceVisibility,
  ) {}
}
