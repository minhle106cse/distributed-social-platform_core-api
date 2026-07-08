import { Module } from '@nestjs/common'
import { OUTBOX_REPOSITORY } from './domain/repositories/outbox.repository'
import { PrismaOutboxRepository } from './infrastructure/repositories/prisma-outbox.repository'
import { PollingPublisherService } from './infrastructure/publishers/polling-publisher.service'
import { OutboxReaperService } from './infrastructure/reapers/outbox-reaper.service'

@Module({
  providers: [
    { provide: OUTBOX_REPOSITORY, useClass: PrismaOutboxRepository },
    PollingPublisherService,
    OutboxReaperService,
  ],
  exports: [OUTBOX_REPOSITORY],
})
export class OutboxModule {}
