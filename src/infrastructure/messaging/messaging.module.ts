import { Global, Module } from '@nestjs/common'
import { MESSAGE_PUBLISHER } from '@distributed-social-platform/shared-kernel'
import { KafkaProducerService } from '@/infrastructure/kafka/kafka-producer.service'
import { QueueProducerService } from '@/infrastructure/queue/queue-producer.service'
import { CompositeMessagePublisher } from './composite-message-publisher'

@Global()
@Module({
  // All transport adapters live here — KafkaModule only owns the raw client.
  providers: [
    KafkaProducerService,
    QueueProducerService,
    {
      provide: MESSAGE_PUBLISHER,
      useFactory: (kafka: KafkaProducerService, queue: QueueProducerService) =>
        new CompositeMessagePublisher([kafka, queue]),
      inject: [KafkaProducerService, QueueProducerService],
    },
  ],
  exports: [MESSAGE_PUBLISHER],
})
export class MessagingModule {}
