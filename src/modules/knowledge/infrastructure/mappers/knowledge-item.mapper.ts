import { KnowledgeItem } from '../../domain/entities/knowledge-item.entity'
import type { KnowledgeType, KnowledgeStatus } from '../../domain/entities/knowledge-item.entity'

type PrismaKnowledgeItem = {
  id: string
  orgId: string
  spaceId: string
  type: string
  title: string
  body: string
  parentId: string | null
  acceptedAnswerId: string | null
  status: string
  isVerified: boolean
  version: number
  contentHash: string | null
  createdByUserId: string
  updatedByUserId: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class KnowledgeItemMapper {
  static toDomain(row: PrismaKnowledgeItem): KnowledgeItem {
    return KnowledgeItem.rehydrate({
      id: row.id,
      orgId: row.orgId,
      spaceId: row.spaceId,
      type: row.type as KnowledgeType,
      title: row.title,
      body: row.body,
      parentId: row.parentId,
      acceptedAnswerId: row.acceptedAnswerId,
      status: row.status as KnowledgeStatus,
      isVerified: row.isVerified,
      version: row.version,
      createdByUserId: row.createdByUserId,
      updatedByUserId: row.updatedByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    })
  }

  static toPersistence(item: KnowledgeItem) {
    return {
      id: item.id,
      orgId: item.orgId,
      spaceId: item.spaceId,
      type: item.type,
      title: item.title,
      body: item.body,
      parentId: item.parentId,
      acceptedAnswerId: item.acceptedAnswerId,
      status: item.status,
      isVerified: item.isVerified,
      version: item.version,
      contentHash: null as string | null,
      createdByUserId: item.createdByUserId,
      updatedByUserId: item.updatedByUserId,
      deletedAt: item.deletedAt,
    }
  }
}
