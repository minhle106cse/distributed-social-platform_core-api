import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import type { FastifyRequest } from 'fastify'
import type { OrgContext } from '@/infrastructure/http/types/org-context.interface'
import { runWithTenant } from '@/common/tenant/tenant.context'

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { org?: OrgContext }>()
    const orgId = request.org?.orgId // set by OrgGuard after membership check
    if (!orgId) return next.handle()
    return runWithTenant(orgId, () => next.handle())
  }
}
