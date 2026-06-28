import type { KnowledgeItem } from '../entities/knowledge-item.entity'

export interface IKnowledgeItemRepository {
  save(item: KnowledgeItem): Promise<void>
  findById(id: string): Promise<KnowledgeItem | null>
  // OCC: chỉ update nếu version DB == expectedVersion. false = conflict.
  updateWithOcc(item: KnowledgeItem, expectedVersion: number): Promise<boolean>
  // No-OCC update: dùng cho publish/verify/softDelete (status/isVerified/deletedAt).
  update(item: KnowledgeItem): Promise<void>
}

export const KNOWLEDGE_ITEM_REPOSITORY = Symbol('IKnowledgeItemRepository')
