import { registerAs } from '@nestjs/config'

export const envConfig = registerAs('env', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.CORE_API_PORT ?? process.env.PORT ?? 4002),
  corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS,
  jwtPublicKey: Buffer.from(process.env.JWT_PUBLIC_KEY!, 'base64').toString('utf-8'),
}))
