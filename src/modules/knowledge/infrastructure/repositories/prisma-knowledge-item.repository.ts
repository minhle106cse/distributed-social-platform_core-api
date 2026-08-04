import type { Prisma } from '@/generated'
import { requireTenantId } from '@/common/tenant/tenant.context'
import type { KnowledgeItem } from '../../domain/entities/knowledge-item.entity'
import type { IKnowledgeItemRepository } from '../../domain/repositories/knowledge-item.repository'
import { KnowledgeItemMapper } from '../mappers/knowledge-item.mapper'

export class PrismaKnowledgeItemRepository implements IKnowledgeItemRepository {
  constructor(private readonly client: Prisma.TransactionClient) {}

  async save(item: KnowledgeItem): Promise<void> {
    await this.client.knowledgeItem.create({ data: KnowledgeItemMapper.toPersistence(item) })
  }

  async findById(id: string): Promise<KnowledgeItem | null> {
    // deletedAt:null injecté automatiquement par l'extension soft-delete.
    const row = await this.client.knowledgeItem.findFirst({
      where: { id, orgId: requireTenantId() },
    })
    return row ? KnowledgeItemMapper.toDomain(row) : null
  }

  // OCC: atomic — ne met à jour que si version DB == expectedVersion.
  async updateWithOcc(item: KnowledgeItem, expectedVersion: number): Promise<boolean> {
    const result = await this.client.knowledgeItem.updateMany({
      where: { id: item.id, orgId: requireTenantId(), version: expectedVersion },
      data: {
        title: item.title,
        body: item.body,
        status: item.status,
        isVerified: item.isVerified,
        version: item.version,
        updatedByUserId: item.updatedByUserId,
        deletedAt: item.deletedAt,
      },
    })
    return result.count === 1
  }

  // No-OCC: dùng cho publish/verify/softDelete/acceptAnswer — cập nhật trạng thái, không đụng version.
  async update(item: KnowledgeItem): Promise<void> {
    await this.client.knowledgeItem.updateMany({
      where: { id: item.id, orgId: requireTenantId() },
      data: {
        status: item.status,
        isVerified: item.isVerified,
        acceptedAnswerId: item.acceptedAnswerId,
        updatedByUserId: item.updatedByUserId,
        deletedAt: item.deletedAt,
      },
    })
  }
}
