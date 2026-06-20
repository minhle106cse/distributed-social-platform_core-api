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
    const snap = space.toSnapshot()
    return {
      id: snap.id,
      orgId: snap.orgId,
      name: snap.name,
      visibility: snap.visibility,
      deletedAt: snap.deletedAt,
    }
  }
}
