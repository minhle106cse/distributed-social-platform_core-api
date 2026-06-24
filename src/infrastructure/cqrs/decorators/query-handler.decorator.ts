import { SetMetadata } from '@nestjs/common'
import { QUERY_HANDLER_METADATA } from '@distributed-social-platform/shared-kernel'

export const QueryHandler = (query: any): ClassDecorator => {
  return SetMetadata(QUERY_HANDLER_METADATA, query)
}
