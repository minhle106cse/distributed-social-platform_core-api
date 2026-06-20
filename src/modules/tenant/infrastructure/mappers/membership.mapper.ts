import { Membership, OrgRole } from '../../domain/entities/membership.entity'

type PrismaMembership = {
  id: string
  orgId: string
  userId: string
  role: string
  joinedAt: Date
}

export class MembershipMapper {
  static toDomain(row: PrismaMembership): Membership {
    return Membership.rehydrate({
      id: row.id,
      orgId: row.orgId,
      userId: row.userId,
      role: row.role as OrgRole,
      joinedAt: row.joinedAt,
    })
  }

  static toPersistence(membership: Membership) {
    const snap = membership.toSnapshot()
    return {
      id: snap.id,
      orgId: snap.orgId,
      userId: snap.userId,
      role: snap.role,
      joinedAt: snap.joinedAt,
    }
  }
}
