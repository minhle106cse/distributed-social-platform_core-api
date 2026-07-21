import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Interval } from '@nestjs/schedule'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import {
  OUTBOX_REPOSITORY,
  type IOutboxRepository,
} from '../../domain/repositories/outbox.repository'

/**
 * Reaper — recovers outbox rows a publisher claimed (INFLIGHT) but never
 * resolved because the process crashed between claim and publish. Any INFLIGHT
 * row older than the claim timeout is returned to PENDING for another poll.
 * Safe under at-least-once: if the row was actually published before the
 * crash, redelivery is deduped by the idempotent consumer. Separate service
 * from PollingPublisherService — different failure mode, different cadence.
 *
 * Driving adapter only — the reap threshold/query lives behind
 * IOutboxRepository (see polling-publisher.service.ts for the same rationale).
 */
@Injectable()
export class OutboxReaperService {
  private reaping = false
  private readonly claimTimeoutMs: number

  constructor(
    @Inject(OUTBOX_REPOSITORY) private readonly outboxRepo: IOutboxRepository,
    @InjectPinoLogger(OutboxReaperService.name) private readonly logger: PinoLogger,
    config: ConfigService,
  ) {
    this.claimTimeoutMs = config.getOrThrow<number>('env.outboxClaimTimeoutMs')
  }

  @Interval(30000)
  async reapStaleClaims(): Promise<void> {
    if (this.reaping) return
    this.reaping = true

    try {
      const reaped = await this.outboxRepo.reapStaleInflight(this.claimTimeoutMs)
      if (reaped > 0) {
        this.logger.warn({ reaped }, 'Reaped stale INFLIGHT outbox rows back to PENDING')
      }
    } finally {
      this.reaping = false
    }
  }
}
