import { Module } from '@nestjs/common'
import { OUTBOX_REPOSITORY } from './domain/repositories/outbox.repository'
import { PrismaOutboxRepository } from './infrastructure/repositories/prisma-outbox.repository'
import { PollingPublisherService } from './infrastructure/publishers/polling-publisher.service'

@Module({
  providers: [
    { provide: OUTBOX_REPOSITORY, useClass: PrismaOutboxRepository },
    PollingPublisherService,
  ],
  exports: [OUTBOX_REPOSITORY],
})
export class OutboxModule {}
