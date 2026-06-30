import { z } from 'zod'

export const GetFeedSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(parseInt(v ?? '20', 10) || 20, 100)),
  offset: z
    .string()
    .optional()
    .transform((v) => parseInt(v ?? '0', 10) || 0),
})

export type GetFeedDto = z.infer<typeof GetFeedSchema>
