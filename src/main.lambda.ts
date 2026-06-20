import awsLambdaFastify from '@fastify/aws-lambda'
import type { APIGatewayProxyEvent, Context } from 'aws-lambda'
import { createApp } from './app'

type LambdaHandler = (event: APIGatewayProxyEvent, context: Context) => Promise<unknown>

let proxy: LambdaHandler

async function bootstrap(): Promise<LambdaHandler> {
  const app = await createApp()
  const fastifyInstance = app.getHttpAdapter().getInstance()
  return awsLambdaFastify(fastifyInstance) as LambdaHandler
}

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<unknown> => {
  if (!proxy) {
    proxy = await bootstrap()
  }
  return proxy(event, context)
}
