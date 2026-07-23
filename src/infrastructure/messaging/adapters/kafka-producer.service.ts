import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Producer } from 'kafkajs'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import {
  LogContext,
  Transport,
  topicForEventType,
  type CloudEvent,
  type ITransportPublisher,
} from '@distributed-social-platform/shared-kernel'
import { KafkaClientService } from '@/infrastructure/kafka/kafka-client.service'

@Injectable()
export class KafkaProducerService implements ITransportPublisher, OnModuleInit, OnModuleDestroy {
  readonly transport = Transport.KAFKA
  private readonly producer: Producer

  constructor(
    kafkaClient: KafkaClientService,
    @InjectPinoLogger(KafkaProducerService.name) private readonly logger: PinoLogger,
  ) {
    // Idempotent producer: dedups broker-side on kafkajs internal retries.
    // maxInFlightRequests:5 is the Kafka-documented ceiling for idempotence to
    // preserve ordering under retries (kafkajs does NOT set this automatically
    // just because idempotent:true is passed — it must be set explicitly here;
    // verified against kafkajs source, previously left unset). Note delivery is
    // still at-least-once overall (the outbox poll loop can re-publish after a
    // crash), so any future consumer must be idempotent — the dedup guard lives
    // on the consumer side, not here.
    this.producer = kafkaClient.client.producer({ idempotent: true, maxInFlightRequests: 5 })
  }

  async onModuleInit(): Promise<void> {
    await this.producer.connect()
    this.logger.info({ context: LogContext.OUTBOX }, 'Kafka producer connected')
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect()
    this.logger.info({ context: LogContext.OUTBOX }, 'Kafka producer disconnected')
  }

  // Topic + partition key are Kafka concerns, derived here from the CloudEvent —
  // callers (outbox publisher) stay transport-agnostic. The key is the CloudEvents
  // Partitioning extension (partitionkey) so one aggregate keeps partition ordering.
  async publish<TData>(event: CloudEvent<TData>): Promise<void> {
    await this.producer.send({
      topic: topicForEventType(event.type),
      messages: [{ key: event.partitionkey, value: JSON.stringify(event) }],
    })
  }
}
