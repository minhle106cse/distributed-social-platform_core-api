import { Space } from '../../domain/entities/space.entity'
import type { SpaceVisibility } from '../../domain/entities/space.entity'

type PrismaSpace = {
  id: string
  orgId: string
  name: string
  // Domain-owned type, not @/generated — mapper stays the isolation boundary
  // so domain never depends on Prisma directly (matches membership/org-invite.mapper.ts).
  visibility: SpaceVisibility
  deletedAt: Date | null
}

export class SpaceMapper {
  static toDomain(row: PrismaSpace): Space {
    return Space.rehydrate({
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      visibility: row.visibility,
      deletedAt: row.deletedAt,
    })
  }

  static toPersistence(space: Space) {
    return {
      id: space.id,
      orgId: space.orgId,
      name: space.name,
      visibility: space.visibility,
      deletedAt: space.deletedAt,
    }
  }
}
