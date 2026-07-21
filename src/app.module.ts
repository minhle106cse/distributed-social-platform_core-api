import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'
import { HealthController } from './infrastructure/http/controllers/health.controller'
import { TenantContextMiddleware } from './infrastructure/http/middlewares/tenant-context.middleware'
import { HttpLoggingInterceptor } from './infrastructure/http/interceptors/http-logging.interceptor'
import { ResponseInterceptor } from './infrastructure/http/interceptors/response.interceptor'
import { GlobalExceptionFilter } from './infrastructure/http/filter/global-exception.filter'
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { OrgAwareThrottlerGuard } from './infrastructure/http/guards/org-aware-throttler.guard'
import { ScheduleModule } from '@nestjs/schedule'
import { LoggerModule } from 'nestjs-pino'
import { ConfigModule } from './config/config.module'
import { PrismaModule } from './infrastructure/database/prisma/prisma.module'
import { HttpIdempotencyModule } from './infrastructure/http/idempotency/idempotency.module'
import { createLogger } from '@distributed-social-platform/shared-kernel'

import { CqrsModule } from './infrastructure/cqrs/cqrs.module'
import { KafkaModule } from './infrastructure/kafka/kafka.module'
import { MessagingModule } from './infrastructure/messaging/messaging.module'
import { TenantModule } from './modules/tenant/tenant.module'
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module'
import { KnowledgeModule } from './modules/knowledge/knowledge.module'
import { EngagementModule } from './modules/engagement/engagement.module'
import { OutboxModule } from './modules/outbox/outbox.module'
import { FeedModule } from './modules/feed/feed.module'
import { CreditModule } from './modules/credit/credit.module'

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule,
    CqrsModule,
    PrismaModule,
    HttpIdempotencyModule,
    KafkaModule,
    MessagingModule,
    OutboxModule,
    TenantModule,
    PlatformAdminModule,
    KnowledgeModule,
    EngagementModule,
    FeedModule,
    CreditModule,
    // Rate limiting — the single mechanism for this NestJS service (replaces
    // @fastify/rate-limit, which can't do per-route in NestJS). Global default
    // 100 / 60s; sensitive routes tighten it via @Throttle() in controllers.
    // Tracked per-org (OrgAwareThrottlerGuard below), not per-IP — see resilience_patterns.md §4.1.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    LoggerModule.forRootAsync({
      useFactory: () => ({
        pinoHttp: {
          logger: createLogger('core-api'),
          autoLogging: {
            ignore: (req) => req.url === '/health' || req.url === '/metrics',
          },
          customAttributeKeys: {
            req: 'request',
            res: 'response',
            err: 'error',
            responseTime: 'responseTime',
          },
        },
      }),
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: OrgAwareThrottlerGuard },
    HttpLoggingInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
    ResponseInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    GlobalExceptionFilter,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    TenantContextMiddleware,
  ],
})
export class AppModule implements NestModule {
  // Mở tenant context (AsyncLocalStorage) cho mọi request, sớm nhất có thể.
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*')
  }
}
