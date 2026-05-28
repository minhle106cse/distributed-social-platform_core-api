import { NestFastifyApplication } from '@nestjs/platform-fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import compress from '@fastify/compress'
import rateLimit from '@fastify/rate-limit'
import { setupSwagger } from './swagger'

export async function setupFastify(app: NestFastifyApplication) {
  const fastify = app.getHttpAdapter().getInstance()

  await fastify.register(cors, {
    origin: ['*'],
    credentials: true,
  })

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  await fastify.register(helmet)

  await fastify.register(compress, {
    encodings: ['gzip', 'deflate', 'br'],
  })

  setupSwagger(app)
}
