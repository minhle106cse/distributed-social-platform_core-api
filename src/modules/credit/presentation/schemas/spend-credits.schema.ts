import { z } from 'zod'

export const SpendCreditsSchema = z.object({
  amount: z.number().int().positive().max(1_000_000),
  reason: z.string().trim().min(1).max(200),
})

export type SpendCreditsDto = z.infer<typeof SpendCreditsSchema>
