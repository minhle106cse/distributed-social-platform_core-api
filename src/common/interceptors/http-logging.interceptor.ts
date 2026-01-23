import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Logger } from 'nestjs-pino'
import { FastifyRequest, FastifyReply } from 'fastify'
import { finalize } from 'rxjs/operators'

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp()
    const req = http.getRequest<FastifyRequest>()
    const res = http.getResponse<FastifyReply>()

    const start = process.hrtime.bigint()

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000

        const payload = {
          requestId: req.id,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          durationMs,
        }

        if (res.statusCode >= 500) {
          this.logger.error(payload, 'HTTP request')
          return
        }

        if (res.statusCode >= 400) {
          this.logger.warn(payload, 'HTTP request')
          return
        }

        this.logger.log(payload, 'HTTP request')
      }),
    )
  }
}
