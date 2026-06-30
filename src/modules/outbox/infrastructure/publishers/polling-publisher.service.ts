import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Interval } from '@nestjs/schedule'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import {
  MESSAGE_PUBLISHER,
  type CloudEvent,
  type IMessagePublisher,
} from '@distributed-social-platform/shared-kernel'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'

@Injectable()
export class PollingPublisherService {
  private running = false
  private readonly maxAttempts: number
  private readonly pollBatchSize: number

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MESSAGE_PUBLISHER) private readonly publisher: IMessagePublisher,
    @InjectPinoLogger(PollingPublisherService.name) private readonly logger: PinoLogger,
    config: ConfigService,
  ) {
    this.maxAttempts = config.get<number>('env.outboxMaxAttempts') ?? 5
    this.pollBatchSize = config.get<number>('env.outboxPollBatchSize') ?? 50
  }

  @Interval(2000)
  async poll(): Promise<void> {
    if (this.running) return
    this.running = true

    try {
      const events = await this.prisma.client.outboxEvent.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: this.pollBatchSize,
      })

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
            orgid: (event.payload as Record<string, string>).orgId ?? '',
            partitionkey: event.aggregateId,
          }

          await this.publisher.publish(cloudEvent)

          await this.prisma.client.outboxEvent.update({
            where: { id: event.id },
            data: { status: 'PROCESSED', processedAt: new Date() },
          })
        } catch (err) {
          const nextAttempts = event.attempts + 1
          const nextStatus = nextAttempts >= this.maxAttempts ? 'FAILED_DLQ' : 'PENDING'

          await this.prisma.client.outboxEvent.update({
            where: { id: event.id },
            data: {
              attempts: nextAttempts,
              lastError: String(err),
              status: nextStatus,
            },
          })

          this.logger.warn(
            { eventId: event.id, attempts: nextAttempts, err },
            'Failed to publish outbox event',
          )
        }
      }
    } finally {
      this.running = false
    }
  }
}
