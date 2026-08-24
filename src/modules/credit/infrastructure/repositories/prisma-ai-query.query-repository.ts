import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import type { IAiQueryQueryRepository } from '../../application/repositories/ai-query.query-repository'
import type { AiQueryListItemDto } from '../../application/queries/ai-query.dto'

@Injectable()
export class PrismaAiQueryQueryRepository implements IAiQueryQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(orgId: string, userId: string, limit: number): Promise<AiQueryListItemDto[]> {
    const rows = await this.prisma.client.aiQuery.findMany({
      where: { orgId, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return rows.map((row) => ({
      id: row.id,
      question: row.question,
      answer: row.answer,
      // Trust on read: written by CommitAiQueryCommand from a typed shape.
      sources: row.sources as unknown as AiQueryListItemDto['sources'],
      creditCost: row.creditCost,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    }))
  }
}
