import { z } from 'zod'

export const CastVoteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
})

export type CastVoteDto = z.infer<typeof CastVoteSchema>
