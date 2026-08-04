import type { Prisma } from '@/generated'
import type { Organization } from '../../domain/entities/organization.entity'
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository'
import { OrganizationMapper } from '../mappers/organization.mapper'

export class PrismaOrganizationRepository implements IOrganizationRepository {
  constructor(private readonly client: Prisma.TransactionClient) {}

  async findById(id: string): Promise<Organization | null> {
    const row = await this.client.organization.findFirst({
      where: { id },
    })
    return row ? OrganizationMapper.toDomain(row) : null
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const row = await this.client.organization.findFirst({
      where: { slug },
    })
    return row ? OrganizationMapper.toDomain(row) : null
  }

  async save(org: Organization): Promise<void> {
    const data = OrganizationMapper.toPersistence(org)
    await this.client.organization.upsert({
      where: { id: data.id },
      create: data,
      update: {
        name: data.name,
        slug: data.slug,
        seatLimit: data.seatLimit,
        deletedAt: data.deletedAt,
      },
    })
  }
}
