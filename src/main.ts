import { ConfigService } from '@nestjs/config'
import { createApp } from './app'

async function bootstrap() {
  const app = await createApp()
  const config = app.get(ConfigService)

  const port = config.get<number>('env.port') ?? 4002
  await app.listen({ port, host: '0.0.0.0' })
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err)
  process.exit(1)
})
