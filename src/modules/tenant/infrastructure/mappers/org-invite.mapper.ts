import { OrgInvite } from '../../domain/entities/org-invite.entity'
import type { ManageableOrgRole, OrgRole } from '../../domain/entities/membership.entity'

type PrismaOrgInvite = {
  id: string
  token: string
  orgId: string
  role: OrgRole
  createdBy: string
  expiresAt: Date
  usedAt: Date | null
  usedBy: string | null
}

export class OrgInviteMapper {
  static toDomain(row: PrismaOrgInvite): OrgInvite {
    return OrgInvite.rehydrate({
      id: row.id,
      token: row.token,
      orgId: row.orgId,
      // Trust persistence: an invite is only ever written with a manageable role
      // (OrgInvite.create enforces it) and the DB OrgRole enum guarantees a valid
      // value. Reconstitution narrows within that enum — it does not re-validate.
      role: row.role as ManageableOrgRole,
      createdBy: row.createdBy,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      usedBy: row.usedBy,
    })
  }

  static toPersistence(invite: OrgInvite) {
    const snap = invite.toSnapshot()
    return {
      id: snap.id,
      token: snap.token,
      orgId: snap.orgId,
      role: snap.role,
      createdBy: snap.createdBy,
      expiresAt: snap.expiresAt,
      usedAt: snap.usedAt,
      usedBy: snap.usedBy,
    }
  }
}
