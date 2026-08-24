import { Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { CommandBus, LogContext } from '@distributed-social-platform/shared-kernel'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { ScheduledJobRegistry } from '@/infrastructure/scheduled-jobs/scheduled-job-registry.service'
import { ReleaseCreditReservationCommand } from '../../application/commands/release-credit-reservation/release-credit-reservation.command'

const JOB_NAME = 'ExpiredReservationSweeperService'
const BATCH_SIZE = 50

interface StaleReservationRow {
  orgId: string
  userId: string
  reservationId: string
}

/**
 * Recovery path for credit holds nobody will ever close.
 *
 * The saga registers its compensation the instant the hold exists, and a
 * compensation that FAILS is retried by SagaCompensationReaperService. Neither
 * covers the window before that: a process killed between the reserve
 * committing and the compensation being recorded leaves a reservation OPEN with
 * nothing anywhere that remembers it. The credit is not lost — `balance` never
 * moved — but `available` is permanently short, which is worse than a visible
 * error because the user sees the right balance and cannot spend it.
 *
 * This is deliberately dumber than a reaper: no claim/status columns, because
 * the ledger IS the state and `releaseReservation` is already idempotent. Two
 * instances sweeping the same row at once produce one release and one no-op.
 *
 * ⚠️ LOAD-BEARING CONSTRAINT — this job runs from `setInterval`, i.e. OUTSIDE any
 * HTTP request, so there is NO tenant context: `requireTenantId()` reads the
 * AsyncLocalStorage store that `TenantContextMiddleware` populates per-request,
 * and it THROWS when that store is empty.
 *
 * This service works today only because every repository the command it
 * dispatches touches — `creditEvents`, `aiQueries`, `outbox` — takes `orgId` as
 * an explicit argument. The repositories that DO call `requireTenantId()`
 * (knowledge, engagement, tenant) are simply never reached from here. That was
 * true by luck of which repos were needed, not by any rule, and nothing checks it.
 *
 * So: any command dispatched from a background job must reach only repositories
 * that take `orgId` explicitly. Adding a `requireTenantId()` call to a repository
 * on this path breaks the sweeper at RUNTIME on its first pass — and unit tests
 * with mocked repositories will still report green. The same constraint applies
 * to `SagaCompensationReaperService`, `OutboxReaperService` and every other
 * `ScheduledJobRegistry` job.
 */
@Injectable()
export class ExpiredReservationSweeperService implements OnApplicationBootstrap, OnModuleDestroy {
  private timer?: NodeJS.Timeout
  private running = false
  private readonly ttlMs: number
  private readonly intervalMs: number

  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
    @InjectPinoLogger(ExpiredReservationSweeperService.name) private readonly logger: PinoLogger,
    private readonly jobRegistry: ScheduledJobRegistry,
    config: ConfigService,
  ) {
    this.ttlMs = config.getOrThrow<number>('env.aiReservationTtlMs')
    this.intervalMs = config.getOrThrow<number>('env.aiReservationSweepIntervalMs')
    this.jobRegistry.register({
      name: JOB_NAME,
      schedule: `every ${this.intervalMs}ms (setInterval)`,
      file: 'apps/core-api/src/modules/credit/infrastructure/services/expired-reservation-sweeper.service.ts',
      purpose: 'Release credit reservations left OPEN past their TTL by a crashed saga',
    })
  }

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.sweep(), this.intervalMs)
    this.timer.unref()
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async sweep(): Promise<void> {
    if (this.running) return
    this.running = true

    try {
      const stale = await this.findStaleReservations()
      for (const row of stale) {
        // Through the bus like any other command — retried on a transient DB
        // error, logged, wrapped in its own transaction. Reaching for the
        // repository directly here would bypass all of that.
        await this.commandBus.execute(
          new ReleaseCreditReservationCommand(
            row.orgId,
            row.userId,
            row.reservationId,
            '',
            'EXPIRED',
          ),
        )
      }
      if (stale.length > 0) {
        this.logger.warn(
          { context: LogContext.COMMAND_BUS, released: stale.length, ttlMs: this.ttlMs },
          'Released expired credit reservations — a saga died mid-flight',
        )
      }
      this.jobRegistry.recordSuccess(JOB_NAME)
    } catch (err) {
      this.jobRegistry.recordFailure(JOB_NAME)
      this.logger.error(
        { context: LogContext.COMMAND_BUS, err },
        'Expired-reservation sweep failed',
      )
    } finally {
      this.running = false
    }
  }

  /**
   * CreditReserved rows past the TTL with no Committed/Released carrying the same
   * reservationId. Raw SQL because the match is on a JSON field inside the payload
   * — Prisma's JSON filters cannot express the correlated NOT EXISTS. The
   * `eventType, createdAt` index keeps the outer scan off the whole ledger.
   */
  private findStaleReservations(): Promise<StaleReservationRow[]> {
    const cutoff = new Date(Date.now() - this.ttlMs)
    return this.prisma.client.$queryRaw<StaleReservationRow[]>`
      SELECT r.org_id AS "orgId",
             r.user_id AS "userId",
             r.payload->>'reservationId' AS "reservationId"
      FROM credit_events r
      WHERE r.event_type = 'CreditReserved'
        AND r.created_at < ${cutoff}
        AND NOT EXISTS (
          SELECT 1 FROM credit_events c
          WHERE c.aggregate_id = r.aggregate_id
            AND c.event_type IN ('CreditReservationCommitted', 'CreditReservationReleased')
            AND c.payload->>'reservationId' = r.payload->>'reservationId'
        )
      LIMIT ${BATCH_SIZE}
    `
  }
}
