import type { Prisma } from '@/generated'
import { requireTenantId } from '@/common/tenant/tenant.context'
import type { Space } from '../../domain/entities/space.entity'
import type { ISpaceRepository } from '../../domain/repositories/space.repository'
import { SpaceMapper } from '../mappers/space.mapper'

export class PrismaSpaceRepository implements ISpaceRepository {
  constructor(private readonly client: Prisma.TransactionClient) {}

  async findById(id: string): Promise<Space | null> {
    const row = await this.client.space.findFirst({
      where: { id, orgId: requireTenantId() },
    })
    return row ? SpaceMapper.toDomain(row) : null
  }

  async save(space: Space): Promise<void> {
    const data = SpaceMapper.toPersistence(space)
    await this.client.space.upsert({
      where: { id: data.id },
      create: data,
      update: {
        name: data.name,
        visibility: data.visibility,
        deletedAt: data.deletedAt,
      },
    })
  }
}
