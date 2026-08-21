import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import type { IKnowledgeQueryRepository } from '../../application/repositories/knowledge.query-repository'
import type {
  KnowledgeItemDto,
  KnowledgeListItemDto,
  RevisionDto,
} from '../../application/queries/knowledge.dto'
import type { KnowledgeType, KnowledgeStatus } from '../../domain/entities/knowledge-item.entity'

@Injectable()
export class PrismaKnowledgeQueryRepository implements IKnowledgeQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findItemById(id: string, orgId: string): Promise<KnowledgeItemDto | null> {
    const row = await this.prisma.client.knowledgeItem.findFirst({
      where: { id, orgId },
    })
    if (!row) return null
    return {
      id: row.id,
      orgId: row.orgId,
      spaceId: row.spaceId,
      type: row.type,
      title: row.title,
      body: row.body,
      parentId: row.parentId,
      acceptedAnswerId: row.acceptedAnswerId,
      status: row.status,
      isVerified: row.isVerified,
      version: row.version,
      createdByUserId: row.createdByUserId,
      updatedByUserId: row.updatedByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async findItems(filter: {
    orgId: string
    spaceId?: string
    type?: KnowledgeType
    status?: KnowledgeStatus
    limit: number
    offset: number
  }): Promise<KnowledgeListItemDto[]> {
    const rows = await this.prisma.client.knowledgeItem.findMany({
      where: {
        orgId: filter.orgId,
        ...(filter.spaceId && { spaceId: filter.spaceId }),
        ...(filter.type && { type: filter.type }),
        ...(filter.status && { status: filter.status }),
      },
      orderBy: { updatedAt: 'desc' },
      take: filter.limit,
      skip: filter.offset,
    })
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      status: r.status,
      isVerified: r.isVerified,
      version: r.version,
      updatedAt: r.updatedAt,
    }))
  }

  // item: { orgId } relation filter đảm bảo revision chỉ trả về nếu item thuộc org.
  async findRevisionsByItemId(itemId: string, orgId: string): Promise<RevisionDto[]> {
    const rows = await this.prisma.client.revision.findMany({
      where: { itemId, item: { orgId } },
      orderBy: { version: 'desc' },
    })
    return rows.map((r) => ({
      id: r.id,
      version: r.version,
      editedByUserId: r.editedByUserId,
      createdAt: r.createdAt,
    }))
  }
}
