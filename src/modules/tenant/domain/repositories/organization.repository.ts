import { Organization } from '../entities/organization.entity'

export interface IOrganizationRepository {
  findById(id: string): Promise<Organization | null>
  findBySlug(slug: string): Promise<Organization | null>
  save(org: Organization): Promise<void>
}

export const ORGANIZATION_REPOSITORY = Symbol('IOrganizationRepository')
