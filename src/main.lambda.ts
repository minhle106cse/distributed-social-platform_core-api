import awsLambdaFastify from '@fastify/aws-lambda'
import { createApp } from './app'

let proxy: any

async function bootstrap() {
  const app = await createApp()
  const fastifyInstance = app.getHttpAdapter().getInstance()
  return awsLambdaFastify(fastifyInstance)
}

export const handler = async (event: any, context: any) => {
  if (!proxy) {
    proxy = await bootstrap()
  }
  return proxy(event, context)
}
