import { collectDefaultMetrics } from 'prom-client'
import { ConfigService } from '@nestjs/config'
import { Logger } from 'nestjs-pino'
import { createApp } from './app'
import { GrpcServerBootstrap } from './bootstrap/grpc'

collectDefaultMetrics()

const SHUTDOWN_TIMEOUT_MS = 10_000

async function bootstrap() {
  const app = await createApp()
  const config = app.get(ConfigService)
  const logger = app.get(Logger)

  const port = config.getOrThrow<number>('env.port')
  await app.listen({ port, host: '0.0.0.0' })

  const grpcServer = app.get(GrpcServerBootstrap).start()

  // Stop accepting new HTTP + gRPC requests, let in-flight ones finish
  // (bounded by SHUTDOWN_TIMEOUT_MS), then exit. app.close() still runs
  // every onModuleDestroy hook (PrismaService.$disconnect, etc.) — this adds
  // the forced-exit timeout that enableShutdownHooks() didn't have, AND
  // closes the gRPC server it doesn't know about (resilience_patterns.md §5).
  const shutdown = (signal: string) => {
    logger.log(`${signal} received, shutting down gracefully...`)

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit')
      process.exit(1)
    }, SHUTDOWN_TIMEOUT_MS)
    forceExit.unref() // don't let this timer itself keep the process alive

    Promise.all([
      app.close(),
      new Promise<void>((resolve) => grpcServer.tryShutdown(() => resolve())),
    ])
      .then(() => {
        clearTimeout(forceExit)
        logger.log('Shutdown complete')
        process.exit(0)
      })
      .catch((err) => {
        logger.error(err, 'Error during shutdown')
        process.exit(1)
      })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err)
  process.exit(1)
})
