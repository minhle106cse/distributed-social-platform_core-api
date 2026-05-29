import { Module } from '@nestjs/common'
import { UserModule } from './modules/user/presentation/user.module'
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core'
import { LoggerModule } from 'nestjs-pino'
import { ConfigModule } from './config/config.module'
import { ConfigService } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { createLogger } from '@distributed-social-platform/shared-kernel'

@Module({
  imports: [
    ConfigModule,
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
    UserModule,
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
