import { ApplicationError } from '@distributed-social-platform/shared-kernel'

export class OwnerEmailAlreadyExistsError extends ApplicationError {
  readonly statusCode = 409
  readonly code = 'OWNER_EMAIL_ALREADY_EXISTS'

  constructor() {
    super('A user with this email already exists')
  }
}

export class AuthProvisioningUnavailableError extends ApplicationError {
  readonly statusCode = 503
  readonly code = 'AUTH_PROVISIONING_UNAVAILABLE'

  constructor() {
    super('Could not reach auth-service to provision the org owner')
  }
}
