import { ApplicationError } from '@distributed-social-platform/shared-kernel'

export class NotAQuestionError extends ApplicationError {
  readonly statusCode = 400
  readonly code = 'NOT_A_QUESTION'

  constructor() {
    super('Target item is not a QUESTION')
  }
}

export class NotAnAnswerError extends ApplicationError {
  readonly statusCode = 400
  readonly code = 'NOT_AN_ANSWER'

  constructor() {
    super('Target item is not an ANSWER')
  }
}

export class AnswerNotForQuestionError extends ApplicationError {
  readonly statusCode = 400
  readonly code = 'ANSWER_NOT_FOR_QUESTION'

  constructor() {
    super('The answer does not belong to this question')
  }
}

export class AcceptAnswerForbiddenError extends ApplicationError {
  readonly statusCode = 403
  readonly code = 'ACCEPT_ANSWER_FORBIDDEN'

  constructor() {
    super('Only the question author can accept an answer')
  }
}

export class FollowTargetNotFoundError extends ApplicationError {
  readonly statusCode = 404
  readonly code = 'FOLLOW_TARGET_NOT_FOUND'

  constructor() {
    super('Follow target not found in this organization')
  }
}
