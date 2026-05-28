import { INestApplication } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule, type SwaggerCustomOptions } from '@nestjs/swagger'

export function setupSwagger(app: INestApplication) {
  if (process.env.NODE_ENV === 'production') return

  const config = new DocumentBuilder()
    .setTitle('API')
    .setDescription('Clean Architecture + Fastify')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'access-token',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'refresh-token',
    )
    .build()

  const document = SwaggerModule.createDocument(app, config)

  const swaggerOptions: SwaggerCustomOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'API Docs',
  }

  SwaggerModule.setup('docs', app, document, swaggerOptions)
}
