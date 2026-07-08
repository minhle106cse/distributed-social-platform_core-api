import { OrgSummaryDto } from './system-admin.dto'

/**
 * Platform-wide reads — deliberately NOT tenant-filtered (this module exists
 * precisely to query across every org). Only reachable via
 * SystemPermissionGuard-protected routes.
 */
export interface ISystemAdminQueryRepository {
  listAllOrgs(limit: number, offset: number): Promise<OrgSummaryDto[]>
}

export const SYSTEM_ADMIN_QUERY_REPOSITORY = Symbol('ISystemAdminQueryRepository')
