import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { OrgContext } from '@/common/tenant/org.guard'

export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OrgContext => {
    const request = ctx.switchToHttp().getRequest()
    return request.org
  },
)
