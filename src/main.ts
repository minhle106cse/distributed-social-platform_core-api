import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from './app.module'
import { setupFastify } from './bootstrap/fastify'
import { Logger } from 'nestjs-pino'
import { ConfigService } from '@nestjs/config'

async function bootstrap() {
  const adapter = new FastifyAdapter({
    logger: false,
    bodyLimit: 10 * 1024 * 1024,
  })

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  })

  app.useLogger(app.get(Logger))

  app.setGlobalPrefix('api/v1')

  await setupFastify(app)

  const config = app.get(ConfigService)

  const port = config.get<number>('env.port')
  await app.listen({ port, host: '0.0.0.0' })
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap()
