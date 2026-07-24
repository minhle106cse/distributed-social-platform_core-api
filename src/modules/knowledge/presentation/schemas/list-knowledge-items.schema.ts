import { z } from 'zod'

export const ListKnowledgeItemsSchema = z.object({
  spaceId: z.string().uuid().optional(),
  type: z.enum(['DOCUMENT', 'QUESTION', 'ANSWER', 'RUNBOOK', 'ADR']).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'STALE']).optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(parseInt(v ?? '50', 10) || 50, 100)),
  offset: z
    .string()
    .optional()
    .transform((v) => parseInt(v ?? '0', 10) || 0),
})

export type ListKnowledgeItemsDto = z.infer<typeof ListKnowledgeItemsSchema>
