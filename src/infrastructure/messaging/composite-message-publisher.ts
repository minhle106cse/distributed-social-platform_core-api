import { Injectable } from '@nestjs/common'
import {
  transportsForEventType,
  type CloudEvent,
  type IMessagePublisher,
  type ITransportPublisher,
  type TransportValue,
} from '@distributed-social-platform/shared-kernel'

/**
 * The single outbound entry point. Given an event, it looks up the transports
 * declared for its `type` (EVENT_TRANSPORT_MAP) and forwards to each registered
 * adapter — so an event can land on Kafka, the queue, or both.
 *
 * Delivery is at-least-once: if a later transport throws, the whole publish fails
 * and the outbox row stays PENDING for retry. A retry may re-deliver to a transport
 * that already succeeded, so any consumer must be idempotent — consistent with the
 * existing outbox semantics.
 */
@Injectable()
export class CompositeMessagePublisher implements IMessagePublisher {
  private readonly byTransport: Map<TransportValue, ITransportPublisher>

  constructor(publishers: ITransportPublisher[]) {
    this.byTransport = new Map(publishers.map((p) => [p.transport, p]))
  }

  async publish<TData>(event: CloudEvent<TData>): Promise<void> {
    for (const transport of transportsForEventType(event.type)) {
      const publisher = this.byTransport.get(transport)
      if (!publisher) {
        throw new Error(
          `Event ${event.type} routed to transport "${transport}" but no adapter is registered.`,
        )
      }
      await publisher.publish(event)
    }
  }
}
