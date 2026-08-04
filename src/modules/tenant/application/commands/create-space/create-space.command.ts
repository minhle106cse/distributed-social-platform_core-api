import { ICommand } from '@distributed-social-platform/shared-kernel'
import type { SpaceVisibility } from '@/modules/tenant/domain/entities/space.entity'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// idempotency-key: interceptor on POST /spaces — no natural key stops a duplicate space.
// none: two spaces with the same name from two distinct requests is an accepted outcome.
export class CreateSpaceCommand implements ICommand {
  readonly name = CreateSpaceCommand.name

  constructor(
    public readonly orgId: string,
    public readonly spaceName: string,
    public readonly visibility: SpaceVisibility,
  ) {}
}
