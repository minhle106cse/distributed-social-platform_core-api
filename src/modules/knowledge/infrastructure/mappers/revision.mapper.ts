import { Revision } from '../../domain/entities/revision.entity'

type PrismaRevision = {
  id: string
  itemId: string
  version: number
  bodySnapshot: string
  editedByUserId: string
  createdAt: Date
}

export class RevisionMapper {
  static toDomain(row: PrismaRevision): Revision {
    return Revision.rehydrate({
      id: row.id,
      itemId: row.itemId,
      version: row.version,
      bodySnapshot: row.bodySnapshot,
      editedByUserId: row.editedByUserId,
      createdAt: row.createdAt,
    })
  }

  static toPersistence(revision: Revision) {
    return {
      id: revision.id,
      itemId: revision.itemId,
      version: revision.version,
      bodySnapshot: revision.bodySnapshot,
      editedByUserId: revision.editedByUserId,
    }
  }
}
