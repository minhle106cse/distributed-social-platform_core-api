import { z } from 'zod'

export const AcceptAnswerSchema = z.object({
  answerId: z.string().uuid(),
})

export type AcceptAnswerDto = z.infer<typeof AcceptAnswerSchema>
