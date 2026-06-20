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
    const snap = org.toSnapshot()
    return {
      id: snap.id,
      name: snap.name,
      slug: snap.slug,
      seatLimit: snap.seatLimit,
      aiRateLimitPerMin: snap.aiRateLimitPerMin,
      createdAt: snap.createdAt,
      deletedAt: snap.deletedAt,
    }
  }
}
