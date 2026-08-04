import type { Prisma } from '@/generated'
import { requireTenantId } from '@/common/tenant/tenant.context'
import type { Vote } from '../../domain/entities/vote.entity'
import type { IVoteRepository } from '../../domain/repositories/vote.repository'
import { VoteMapper } from '../mappers/vote.mapper'

export class PrismaVoteRepository implements IVoteRepository {
  constructor(private readonly client: Prisma.TransactionClient) {}

  async findByItemAndUser(itemId: string, userId: string): Promise<Vote | null> {
    const row = await this.client.vote.findFirst({
      where: { itemId, userId, orgId: requireTenantId() },
    })
    return row ? VoteMapper.toDomain(row) : null
  }

  async upsert(vote: Vote): Promise<void> {
    const data = VoteMapper.toPersistence(vote)
    await this.client.vote.upsert({
      where: { itemId_userId: { itemId: vote.itemId, userId: vote.userId } },
      create: data,
      update: { value: vote.value },
    })
  }

  async removeByItemAndUser(itemId: string, userId: string): Promise<void> {
    await this.client.vote.deleteMany({
      where: { itemId, userId, orgId: requireTenantId() },
    })
  }
}
