import { ApplicationError } from '@distributed-social-platform/shared-kernel'

export class OrgSlugAlreadyTakenError extends ApplicationError {
  readonly statusCode = 409
  readonly code = 'ORG_SLUG_ALREADY_TAKEN'

  constructor(slug: string) {
    super(`Organization slug "${slug}" is already taken`)
  }
}

export class OrgNotFoundError extends ApplicationError {
  readonly statusCode = 404
  readonly code = 'ORG_NOT_FOUND'

  constructor() {
    super('Organization not found')
  }
}

export class OrgAccessForbiddenError extends ApplicationError {
  readonly statusCode = 403
  readonly code = 'ORG_ACCESS_FORBIDDEN'

  constructor() {
    super('You do not have access to this organization')
  }
}

export class InvalidOrgPermissionError extends ApplicationError {
  readonly statusCode = 400
  readonly code = 'INVALID_ORG_PERMISSION'

  constructor(permission: string) {
    super(`Unknown org permission: "${permission}"`)
  }
}

export class CannotModifyOwnerPermissionsError extends ApplicationError {
  readonly statusCode = 400
  readonly code = 'CANNOT_MODIFY_OWNER_PERMISSIONS'

  constructor() {
    super('OWNER always holds every permission and cannot be modified')
  }
}

export class InviteNotFoundError extends ApplicationError {
  readonly statusCode = 404
  readonly code = 'INVITE_NOT_FOUND'

  constructor() {
    super('Invite token not found')
  }
}

export class InviteExpiredError extends ApplicationError {
  readonly statusCode = 410
  readonly code = 'INVITE_EXPIRED'

  constructor() {
    super('This invite link has expired')
  }
}

export class InviteAlreadyUsedError extends ApplicationError {
  readonly statusCode = 409
  readonly code = 'INVITE_ALREADY_USED'

  constructor() {
    super('This invite link has already been used')
  }
}

export class AlreadyMemberError extends ApplicationError {
  readonly statusCode = 409
  readonly code = 'ALREADY_MEMBER'

  constructor() {
    super('User is already a member of this organization')
  }
}

export class MembershipNotFoundError extends ApplicationError {
  readonly statusCode = 404
  readonly code = 'MEMBERSHIP_NOT_FOUND'

  constructor() {
    super('Membership not found')
  }
}
