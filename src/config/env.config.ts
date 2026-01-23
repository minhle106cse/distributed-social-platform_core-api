import { registerAs } from '@nestjs/config'

export const envConfig = registerAs('env', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS,
}))
