import type { Prisma } from '@/generated'
import type { Membership } from '../../domain/entities/membership.entity'
import type { IMembershipRepository } from '../../domain/repositories/membership.repository'
import { MembershipMapper } from '../mappers/membership.mapper'

export class PrismaMembershipRepository implements IMembershipRepository {
  constructor(private readonly client: Prisma.TransactionClient) {}

  async findByOrgAndUser(orgId: string, userId: string): Promise<Membership | null> {
    const row = await this.client.membership.findUnique({
      where: { orgId_userId: { orgId, userId } },
    })
    return row ? MembershipMapper.toDomain(row) : null
  }

  async save(membership: Membership): Promise<void> {
    const data = MembershipMapper.toPersistence(membership)
    await this.client.membership.upsert({
      where: { orgId_userId: { orgId: data.orgId, userId: data.userId } },
      create: data,
      update: { role: data.role },
    })
  }
}
