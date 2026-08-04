import { Module } from '@nestjs/common'
import { OUTBOX_DISPATCH_REPOSITORY } from './outbox.repository'
import { PrismaOutboxRepository } from './prisma-outbox.repository'
import { PollingPublisherService } from './polling-publisher.service'
import { OutboxReaperService } from './outbox-reaper.service'
import { OutboxMetricsReporter } from './outbox-metrics-reporter.service'
import { OutboxCleanupService } from './outbox-cleanup.service'

@Module({
  providers: [
    { provide: OUTBOX_DISPATCH_REPOSITORY, useClass: PrismaOutboxRepository },
    PollingPublisherService,
    OutboxReaperService,
    OutboxMetricsReporter,
    OutboxCleanupService,
  ],
  exports: [OUTBOX_DISPATCH_REPOSITORY],
})
export class OutboxModule {}
