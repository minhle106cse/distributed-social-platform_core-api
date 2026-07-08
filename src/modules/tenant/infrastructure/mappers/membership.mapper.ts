import { Membership } from '../../domain/entities/membership.entity'
import type { OrgRole } from '../../domain/org-rbac'

type PrismaMembership = {
  id: string
  orgId: string
  userId: string
  role: OrgRole
  joinedAt: Date
}

export class MembershipMapper {
  static toDomain(row: PrismaMembership): Membership {
    return Membership.rehydrate({
      id: row.id,
      orgId: row.orgId,
      userId: row.userId,
      // Trust persistence: the DB OrgRole enum guarantees a valid value.
      role: row.role,
      joinedAt: row.joinedAt,
    })
  }

  static toPersistence(membership: Membership) {
    return {
      id: membership.id,
      orgId: membership.orgId,
      userId: membership.userId,
      role: membership.role,
      joinedAt: membership.joinedAt,
    }
  }
}
