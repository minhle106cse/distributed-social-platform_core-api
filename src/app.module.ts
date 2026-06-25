import { Module } from '@nestjs/common'
import { HealthController } from './infrastructure/http/controllers/health.controller'
import { HttpLoggingInterceptor } from './infrastructure/http/interceptors/http-logging.interceptor'
import { ResponseInterceptor } from './infrastructure/http/interceptors/response.interceptor'
import { GlobalExceptionFilter } from './infrastructure/http/filter/global-exception.filter'
import { TenantInterceptor } from './infrastructure/http/interceptors/tenant.interceptor'
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { LoggerModule } from 'nestjs-pino'
import { ConfigModule } from './config/config.module'
import { PrismaModule } from './infrastructure/database/prisma/prisma.module'
import { createLogger } from '@distributed-social-platform/shared-kernel'

import { CqrsModule } from './infrastructure/cqrs/cqrs.module'
import { TenantModule } from './modules/tenant/tenant.module'

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule,
    CqrsModule,
    PrismaModule,
    TenantModule,
    // Per-route rate limiting (NestJS-native). The default mirrors the
    // SOP-mandated @fastify/rate-limit global (100 / 60s) so normal routes are
    // not double-restricted; sensitive routes tighten it via @Throttle().
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
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
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    HttpLoggingInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
    TenantInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
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
  ],
})
export class AppModule {}
