import { Module } from '@nestjs/common'
import { UserModule } from './modules/user/presentation/user.module'
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core'
import { LoggerModule } from 'nestjs-pino'
import { ConfigModule } from './config/config.module'
import { ConfigService } from '@nestjs/config'

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('env.nodeEnv') === 'production' ? 'info' : 'debug',

          genReqId: (req) => req.headers['x-request-id'] ?? crypto.randomUUID(),

          autoLogging: {
            ignore: (req) => req.url === '/health' || req.url === '/metrics',
          },

          formatters: {
            level: (label) => ({ level: label }),
          },

          customAttributeKeys: {
            req: 'request',
            res: 'response',
            err: 'error',
            responseTime: 'responseTime',
          },

          base: {
            service: 'api-gateway',
            env: config.get<string>('env.nodeEnv'),
          },

          transport:
            config.get<string>('env.nodeEnv') !== 'production'
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    translateTime: 'yyyy-mm-dd HH:MM:ss',
                    singleLine: true,
                    ignore: 'pid,hostname',
                  },
                }
              : undefined,
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
export class AppModule {}
