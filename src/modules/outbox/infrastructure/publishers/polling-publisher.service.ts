import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Interval } from '@nestjs/schedule'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import {
  MESSAGE_PUBLISHER,
  type CloudEvent,
  type IMessagePublisher,
} from '@distributed-social-platform/shared-kernel'
import {
  OUTBOX_REPOSITORY,
  type IOutboxRepository,
} from '../../domain/repositories/outbox.repository'

/**
 * Polling Publisher (microservices.io) — the half of the Transactional Outbox
 * that moves rows from PENDING to Kafka/queue. Stale-INFLIGHT recovery after a
 * publisher crash is a separate concern, handled by OutboxReaperService.
 *
 * Driving adapter only — the claim/publish/mark algorithm lives behind
 * IOutboxRepository (Hexagonal: swapping the scheduler trigger or the ORM
 * touches only 1 side of this class, never both).
 */
@Injectable()
export class PollingPublisherService {
  private running = false
  private readonly maxAttempts: number
  private readonly pollBatchSize: number

  constructor(
    @Inject(OUTBOX_REPOSITORY) private readonly outboxRepo: IOutboxRepository,
    @Inject(MESSAGE_PUBLISHER) private readonly publisher: IMessagePublisher,
    @InjectPinoLogger(PollingPublisherService.name) private readonly logger: PinoLogger,
    config: ConfigService,
  ) {
    this.maxAttempts = config.getOrThrow<number>('env.outboxMaxAttempts')
    this.pollBatchSize = config.getOrThrow<number>('env.outboxPollBatchSize')
  }

  @Interval(2000)
  async poll(): Promise<void> {
    if (this.running) return
    this.running = true

    try {
      const events = await this.outboxRepo.claimPendingBatch(this.pollBatchSize)
      if (events.length === 0) return

      for (const event of events) {
        try {
          // Map the internal outbox row → public CloudEvents 1.0 wire contract.
          const cloudEvent: CloudEvent = {
            specversion: '1.0',
            id: event.id,
            source: `/cortex/core-api/${event.aggregateType}`,
            type: event.eventType,
            time: event.createdAt.toISOString(),
            subject: event.aggregateId,
            datacontenttype: 'application/json',
            data: event.payload,
            orgid: event.orgId,
            partitionkey: event.aggregateId,
          }

          await this.publisher.publish(cloudEvent)
          await this.outboxRepo.markProcessed(event.id)
        } catch (err) {
          await this.outboxRepo.markFailed(event.id, event.attempts, String(err), this.maxAttempts)

          this.logger.warn(
            { eventId: event.id, attempts: event.attempts + 1, err },
            'Failed to publish outbox event',
          )
        }
      }
    } finally {
      this.running = false
    }
  }
}
