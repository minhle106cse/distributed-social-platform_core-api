import { z } from 'zod'

export const GrantCreditsSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().positive().max(1_000_000),
  reason: z.string().trim().min(1).max(200),
})

export type GrantCreditsDto = z.infer<typeof GrantCreditsSchema>
