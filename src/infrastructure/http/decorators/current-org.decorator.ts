import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { OrgContext } from '@/infrastructure/http/guards/org.guard'

export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OrgContext => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest & { org: OrgContext }>()
    return request.org
  },
)
