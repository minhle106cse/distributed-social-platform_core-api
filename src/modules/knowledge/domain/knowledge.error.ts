import { ApplicationError } from '@distributed-social-platform/shared-kernel'

export class KnowledgeItemNotFoundError extends ApplicationError {
  readonly statusCode = 404
  readonly code = 'KNOWLEDGE_ITEM_NOT_FOUND'

  constructor() {
    super('Knowledge item not found')
  }
}

export class KnowledgeVersionConflictError extends ApplicationError {
  readonly statusCode = 409
  readonly code = 'KNOWLEDGE_VERSION_CONFLICT'

  constructor() {
    super('Knowledge item was modified by another request; retry with the latest version')
  }
}

export class InvalidKnowledgeStateError extends ApplicationError {
  readonly statusCode = 409
  readonly code = 'INVALID_KNOWLEDGE_STATE'

  constructor(message = 'Invalid knowledge item state transition') {
    super(message)
  }
}
