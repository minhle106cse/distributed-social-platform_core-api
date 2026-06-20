import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import type { FastifyRequest } from 'fastify'
import type { JwtPayload } from '@/infrastructure/http/guards/jwt-auth.guard'
import { runWithTenant } from './tenant.context'

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: JwtPayload }>()
    const orgId = request.user?.orgId
    if (!orgId) return next.handle()
    return runWithTenant(orgId, () => next.handle())
  }
}
