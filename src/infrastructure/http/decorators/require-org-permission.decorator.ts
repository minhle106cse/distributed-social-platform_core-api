import { SetMetadata } from '@nestjs/common'
import type { OrgPermissionValue } from '@distributed-social-platform/shared-kernel'

export const ORG_PERMISSION_KEY = 'requiredOrgPermission'

/**
 * Yêu cầu một org permission cụ thể cho route — khai báo theo ACTION, không theo role.
 * OrgGuard resolve permission của role (từ DB, OWNER implicit-all) rồi kiểm tra.
 * Đổi "ai được làm gì" = sửa dữ liệu org_role_permissions, không đụng code route.
 */
export const RequireOrgPermission = (permission: OrgPermissionValue) =>
  SetMetadata(ORG_PERMISSION_KEY, permission)
