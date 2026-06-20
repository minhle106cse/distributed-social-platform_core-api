import { Membership } from '../entities/membership.entity'

export interface IMembershipRepository {
  findByOrgAndUser(orgId: string, userId: string): Promise<Membership | null>
  save(membership: Membership): Promise<void>
}

export const MEMBERSHIP_REPOSITORY = Symbol('IMembershipRepository')
