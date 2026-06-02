import { Module } from '@nestjs/common'
import { HttpLoggingInterceptor } from './infrastructure/http/interceptors/http-logging.interceptor'
import { ResponseInterceptor } from './infrastructure/http/interceptors/response.interceptor'
import { GlobalExceptionFilter } from './infrastructure/http/filter/global-exception.filter'
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core'
import { LoggerModule } from 'nestjs-pino'
import { ConfigModule } from './config/config.module'
import { ConfigService } from '@nestjs/config'
import { PrismaModule } from './infrastructure/database/prisma/prisma.module'
import { createLogger } from '@distributed-social-platform/shared-kernel'

import { CqrsModule } from './infrastructure/cqrs/cqrs.module'

@Module({
  imports: [
    ConfigModule,
    CqrsModule,
    PrismaModule,
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
export class AppModule { }
