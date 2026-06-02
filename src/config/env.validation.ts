import { z } from 'zod';

export const envValidationSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3001'),
});

export function validate(config: Record<string, unknown>) {
  const result = envValidationSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Environment variables validation failed: ${result.error.message}`);
  }

  return result.data;
}
