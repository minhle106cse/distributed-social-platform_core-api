import { z } from 'zod'

export const AskAiSchema = z.object({
  question: z.string().trim().min(1).max(2_000),
  // Bounded here rather than left to the caller's imagination: topK feeds the
  // RAG context window, and a large one is both slow and expensive.
  topK: z.coerce.number().int().min(1).max(20).optional(),
})

export type AskAiDto = z.infer<typeof AskAiSchema>
