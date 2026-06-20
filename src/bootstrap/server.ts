import { randomUUID } from 'crypto'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from '../app.module'
import { setupFastify } from './fastify'
import { ZodValidationPipe } from 'nestjs-zod'
import { Logger } from 'nestjs-pino'

export async function buildServer() {
  const adapter = new FastifyAdapter({
    logger: false,
    bodyLimit: 10 * 1024 * 1024,
    genReqId: (req) => {
      const header = req.headers['x-request-id']
      return Array.isArray(header) ? header[0] : (header ?? randomUUID())
    },
  })

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  })

  app.useLogger(app.get(Logger))
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'metrics'] })
  app.useGlobalPipes(new ZodValidationPipe())
  app.enableShutdownHooks()

  await setupFastify(app)
  await app.init()

  return app
}
