import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'

interface HttpExceptionResponse {
  message?: string | string[]
  errors?: unknown
  code?: string
}

type ErrorDetails = Record<string, unknown> | Array<Record<string, unknown>> | undefined

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: ErrorDetails
  }
  meta: {
    requestId?: string
    timestamp: string
  }
}

function isHttpExceptionResponse(value: unknown): value is HttpExceptionResponse {
  return typeof value === 'object' && value !== null
}

function isErrorDetails(value: unknown): value is ErrorDetails {
  if (value === undefined) return true
  if (Array.isArray(value)) return true
  return typeof value === 'object' && value !== null
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const reply = ctx.getResponse<FastifyReply>()
    const req = ctx.getRequest<FastifyRequest>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let code = 'INTERNAL_ERROR'
    let message = 'Internal server error'
    let details: ErrorDetails

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const response = exception.getResponse()

      if (typeof response === 'string') {
        message = response
      } else if (isHttpExceptionResponse(response)) {
        if (Array.isArray(response.message)) {
          message = response.message.join(', ')
        } else if (typeof response.message === 'string') {
          message = response.message
        }

        if (isErrorDetails(response.errors)) {
          details = response.errors
        }

        if (typeof response.code === 'string') {
          code = response.code
        }
      }
    }

    const body: ErrorResponse = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
      },
    }

    reply.status(status).send(body)
  }
}
