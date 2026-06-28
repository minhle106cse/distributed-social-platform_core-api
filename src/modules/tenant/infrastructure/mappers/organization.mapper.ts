import { Organization } from '../../domain/entities/organization.entity'

type PrismaOrg = {
  id: string
  name: string
  slug: string
  seatLimit: number
  aiRateLimitPerMin: number
  createdAt: Date
  deletedAt: Date | null
}

export class OrganizationMapper {
  static toDomain(row: PrismaOrg): Organization {
    return Organization.rehydrate({
      id: row.id,
      name: row.name,
      slug: row.slug,
      seatLimit: row.seatLimit,
      aiRateLimitPerMin: row.aiRateLimitPerMin,
      createdAt: row.createdAt,
      deletedAt: row.deletedAt,
    })
  }

  static toPersistence(org: Organization) {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      seatLimit: org.seatLimit,
      aiRateLimitPerMin: org.aiRateLimitPerMin,
      createdAt: org.createdAt,
      deletedAt: org.deletedAt,
    }
  }
}
