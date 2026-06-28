import { z } from 'zod'

export const UpdateKnowledgeSchema = z.object({
  expectedVersion: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(100_000),
})

export type UpdateKnowledgeDto = z.infer<typeof UpdateKnowledgeSchema>
