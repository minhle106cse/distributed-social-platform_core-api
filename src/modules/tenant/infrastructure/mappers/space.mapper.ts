import { Space, SpaceVisibility } from '../../domain/entities/space.entity'

type PrismaSpace = {
  id: string
  orgId: string
  name: string
  visibility: string
  deletedAt: Date | null
}

export class SpaceMapper {
  static toDomain(row: PrismaSpace): Space {
    return Space.rehydrate({
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      visibility: row.visibility as SpaceVisibility,
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
