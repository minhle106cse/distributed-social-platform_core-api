import { SetMetadata } from '@nestjs/common'
import type { OrgPermissionValue } from '@distributed-social-platform/shared-kernel'

export const ORG_PERMISSION_KEY = 'requiredOrgPermission'

/**
 * Yêu cầu một org permission cụ thể cho route — khai báo theo ACTION, không theo role.
 * OrgGuard resolve permission của role (từ DB, OWNER implicit-all) rồi kiểm tra.
 * Đổi "ai được làm gì" = sửa dữ liệu org_role_permissions, không đụng code route.
 */
/**
 * Nhiều permission = AND (phải có ĐỦ), không phải OR. Ca thật đầu tiên là
 * POST /ai/ask (Phase 5b): nó vừa đọc knowledge vừa tiêu credit, nên một role
 * chỉ được đọc mà không được tiêu tiền phải bị chặn ở đây.
 */
export const RequireOrgPermission = (...permissions: OrgPermissionValue[]) =>
  SetMetadata(ORG_PERMISSION_KEY, permissions)
