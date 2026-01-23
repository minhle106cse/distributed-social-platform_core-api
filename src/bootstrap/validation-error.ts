import { FastifyInstance } from 'fastify'

export type FastifyValidationError = {
  validation: Array<{
    instancePath: string
    message?: string
  }>
}

export type FastifyHttpError = {
  statusCode?: number
  message?: string
}

export function isFastifyValidationError(error: unknown): error is FastifyValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'validation' in error &&
    Array.isArray((error as { validation?: unknown }).validation)
  )
}

export function isFastifyHttpError(error: unknown): error is FastifyHttpError {
  return typeof error === 'object' && error !== null
}

export function setupValidationError(fastify: FastifyInstance) {
  fastify.setErrorHandler((error, req, reply) => {
    // =========================
    // 1. Validation error (400)
    // =========================
    if (isFastifyValidationError(error)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.validation.map((e) => ({
            field: e.instancePath.replace('/', ''),
            message: e.message ?? 'Invalid value',
          })),
        },
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      })
    }

    // =========================
    // 2. Fallback error
    // =========================
    const statusCode =
      isFastifyHttpError(error) && typeof error.statusCode === 'number' ? error.statusCode : 500

    const message =
      isFastifyHttpError(error) && typeof error.message === 'string'
        ? error.message
        : 'Internal Server Error'

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: statusCode >= 500 ? 'INTERNAL_ERROR' : 'FASTIFY_ERROR',
        message,
      },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
      },
    })
  })
}
