import { z } from 'zod'

export const CreateKnowledgeSchema = z.object({
  spaceId: z.string().uuid(),
  type: z.enum(['DOCUMENT', 'QUESTION', 'ANSWER', 'RUNBOOK', 'ADR']),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(100_000),
  parentId: z.string().uuid().nullable().optional(),
})

export type CreateKnowledgeDto = z.infer<typeof CreateKnowledgeSchema>
