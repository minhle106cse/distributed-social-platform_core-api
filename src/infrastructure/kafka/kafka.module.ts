import { Global, Module } from '@nestjs/common'
import { KafkaClientService } from './kafka-client.service'

@Global()
@Module({
  providers: [KafkaClientService],
  exports: [KafkaClientService],
})
export class KafkaModule {}
