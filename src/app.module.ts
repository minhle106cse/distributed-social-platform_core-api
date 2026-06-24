import { Module } from '@nestjs/common'
import { HealthController } from './infrastructure/http/controllers/health.controller'
import { HttpLoggingInterceptor } from './infrastructure/http/interceptors/http-logging.interceptor'
import { ResponseInterceptor } from './infrastructure/http/interceptors/response.interceptor'
import { GlobalExceptionFilter } from './infrastructure/http/filter/global-exception.filter'
import { TenantInterceptor } from './common/tenant/tenant.interceptor'
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core'
import { LoggerModule } from 'nestjs-pino'
import { ConfigModule } from './config/config.module'
import { ConfigService } from '@nestjs/config'
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
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (_config: ConfigService) => ({
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
