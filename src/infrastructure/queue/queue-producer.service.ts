import { Injectable } from '@nestjs/common'
import { Transport, type ITransportPublisher } from '@distributed-social-platform/shared-kernel'

/**
 * Queue transport adapter (BullMQ over Redis). Registered alongside Kafka so the
 * two coexist — but no event in EVENT_TRANSPORT_MAP routes to QUEUE yet, so this
 * is never called. The moment an event is mapped to Transport.QUEUE without the
 * BullMQ wiring below, it fails LOUD rather than silently dropping the message.
 *
 * To activate: add `bullmq` + Redis config, create a Queue in the ctor, and make
 * `publish` enqueue the envelope. Producer/outbox code does not change.
 */
@Injectable()
export class QueueProducerService implements ITransportPublisher {
  readonly transport = Transport.QUEUE

  publish(): Promise<void> {
    throw new Error(
      'QueueProducerService not wired: an event is routed to Transport.QUEUE but BullMQ is not configured yet.',
    )
  }
}
