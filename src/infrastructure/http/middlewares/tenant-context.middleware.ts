import { Injectable, NestMiddleware } from '@nestjs/common'
import { runWithTenantContext } from '@/common/tenant/tenant.context'

// Mở AsyncLocalStorage context cho TOÀN BỘ request. Dùng middleware (chạy đầu
// vòng đời, gọi next() trong scope) để context propagate đáng tin tới guard /
// handler / repo — khác interceptor (Observable subscribe ngoài scope → mất ctx).
// Store khởi tạo rỗng; OrgGuard điền orgId sau khi xác thực (setTenantId).
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(_req: unknown, _res: unknown, next: () => void): void {
    runWithTenantContext(() => next())
  }
}
