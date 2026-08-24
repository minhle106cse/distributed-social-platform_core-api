import { Module } from '@nestjs/common'
import { PrismaOutboxRepository } from './prisma-outbox.repository'
import { PollingPublisherService } from './polling-publisher.service'
import { OutboxReaperService } from './outbox-reaper.service'
import { OutboxMetricsReporter } from './outbox-metrics-reporter.service'
import { OutboxCleanupService } from './outbox-cleanup.service'

@Module({
  providers: [
    // Provided as the class itself, not behind a token — its four consumers below
    // are all infrastructure, so there is no port to resolve (§6.1).
    PrismaOutboxRepository,
    PollingPublisherService,
    OutboxReaperService,
    OutboxMetricsReporter,
    OutboxCleanupService,
  ],
})
export class OutboxModule {}
