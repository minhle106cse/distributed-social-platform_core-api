import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { JwtPayload } from '../guards/jwt-auth.guard'

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest & { user: JwtPayload }>()
    return request.user
  },
)
