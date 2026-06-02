import { FastifyRequest } from 'fastify'
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable, map } from 'rxjs'

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<FastifyRequest>()

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data: data as unknown,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      })),
    )
  }
}
