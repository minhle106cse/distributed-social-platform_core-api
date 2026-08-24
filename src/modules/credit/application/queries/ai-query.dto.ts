export interface AiQueryListItemDto {
  id: string
  question: string
  answer: string | null
  sources: Array<{ knowledgeItemId: string; title: string }>
  creditCost: number
  /** ANSWERED | FAILED */
  status: string
  createdAt: string
}
