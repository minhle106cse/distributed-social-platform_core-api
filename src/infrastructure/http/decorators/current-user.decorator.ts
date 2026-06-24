import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { JwtPayload } from '../guards/jwt-auth.guard'

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest()
    return request.user // This is populated by JwtAuthGuard
  },
)
