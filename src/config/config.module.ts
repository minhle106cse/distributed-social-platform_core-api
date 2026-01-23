import { Module } from '@nestjs/common'
import { ConfigModule as NestConfigModule } from '@nestjs/config'
import { envConfig } from './env.config'
import { envValidationSchema } from './env.validation'

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development',
      load: [envConfig],
    }),
  ],
})
export class ConfigModule {}
