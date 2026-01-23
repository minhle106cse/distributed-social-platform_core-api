import { NestFastifyApplication } from '@nestjs/platform-fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import { setupValidationError } from './validation-error'
import { setupSwagger } from './swagger'

export async function setupFastify(app: NestFastifyApplication) {
  const fastify = app.getHttpAdapter().getInstance()

  await fastify.register(helmet, {
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  })

  await fastify.register(cors, {
    origin: true,
    credentials: true,
  })

  await fastify.register(cookie)

  setupValidationError(fastify)
  setupSwagger(app)
}
