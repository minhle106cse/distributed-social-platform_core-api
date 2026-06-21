import type { OrgInvite } from '../entities/org-invite.entity'

export interface IOrgInviteRepository {
  save(invite: OrgInvite): Promise<void>
  findByToken(token: string): Promise<OrgInvite | null>
}

export const ORG_INVITE_REPOSITORY = Symbol('IOrgInviteRepository')
