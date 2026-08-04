import { Injectable } from '@nestjs/common'

export type CompensationRunner = (payload: Record<string, unknown>) => Promise<void>

/**
 * Maps a `CompensationAction.type` back to the function that actually re-runs
 * it. The reaper has no idea which module a given `actionType` belongs to, so
 * this is a single global lookup table populated by whichever module owns each
 * action, from its own `onModuleInit` — same pattern as
 * `PrismaTxRunner.registerScope` (register before the thing that resolves it
 * runs).
 */
@Injectable()
export class SagaCompensationRegistry {
  private readonly runners = new Map<string, CompensationRunner>()

  register(actionType: string, runner: CompensationRunner): void {
    if (this.runners.has(actionType)) {
      throw new Error(`Duplicate compensation runner registered for actionType "${actionType}"`)
    }
    this.runners.set(actionType, runner)
  }

  /** Throws if nothing is registered for `actionType` — the reaper treats an
   * unknown type as a permanent failure (counts as an attempt, eventually
   * FAILED_DLQ), never a silent no-op. */
  get(actionType: string): CompensationRunner {
    const runner = this.runners.get(actionType)
    if (!runner) {
      throw new Error(`No compensation runner registered for actionType "${actionType}"`)
    }
    return runner
  }
}
