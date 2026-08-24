import { ICommand } from '@distributed-social-platform/shared-kernel'

/**
 * Compensation for the AI-Query Saga, and also what
 * ExpiredReservationSweeperService dispatches for holds abandoned by a crash.
 *
 * Runs more than once by design (saga rollback → compensation reaper → sweeper
 * can all target the same reservation), so everything it touches is idempotent:
 * the aggregate no-ops a non-OPEN reservation, and the AiQuery row is upserted
 * on `reservationId`.
 *
 * `question` travels on the command because the FAILED record and the user-facing
 * notification both need it, and by this point the saga's in-memory state may be
 * gone (the reaper reconstructs this call from a stored payload).
 */
export class ReleaseCreditReservationCommand implements ICommand {
  readonly name = ReleaseCreditReservationCommand.name

  constructor(
    public readonly orgId: string,
    public readonly userId: string,
    public readonly reservationId: string,
    public readonly question: string,
    /** 'AI_UNAVAILABLE' | 'NO_RESULTS' | 'EXPIRED' */
    public readonly reason: string,
  ) {}
}
