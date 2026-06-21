import { ApplicationError } from '@distributed-social-platform/shared-kernel'

export class OrgSlugAlreadyTakenError extends ApplicationError {
  readonly statusCode = 409
  readonly code = 'ORG_SLUG_ALREADY_TAKEN'

  constructor(slug: string) {
    super(`Organization slug "${slug}" is already taken`)
  }
}

export class OrgAccessForbiddenError extends ApplicationError {
  readonly statusCode = 403
  readonly code = 'ORG_ACCESS_FORBIDDEN'

  constructor() {
    super('You do not have access to this organization')
  }
}
