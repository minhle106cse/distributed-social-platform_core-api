import { AsyncLocalStorage } from 'async_hooks'

interface TenantStore {
  orgId?: string
}

// Store là OBJECT mutable: middleware tạo store rỗng bọc cả request, OrgGuard
// điền orgId vào sau khi xác thực membership (cùng 1 reference suốt request).
const tenantStorage = new AsyncLocalStorage<TenantStore>()

// Gọi từ MIDDLEWARE (không phải interceptor): `run()` bọc trọn vòng đời request
// (guards → interceptors → handler → repos) vì middleware gọi next() ngay trong
// scope. Interceptor cũ trả Observable bị subscribe NGOÀI scope → mất context.
export function runWithTenantContext<R>(callback: () => R): R {
  return tenantStorage.run({}, callback)
}

// OrgGuard điền orgId SAU khi validate membership (mutate store của middleware).
export function setTenantId(orgId: string): void {
  const store = tenantStorage.getStore()
  if (store) store.orgId = orgId
}

// Đọc optional (có thể chưa set ở route không org-scoped).
export function getTenantId(): string | undefined {
  return tenantStorage.getStore()?.orgId
}

// Đọc cho repo tenant-scoped: FAIL-CLOSED — thiếu context thì NÉM, không để
// `orgId: undefined` lọt xuống Prisma (where bỏ filter → rò chéo tenant).
export function requireTenantId(): string {
  const orgId = getTenantId()
  if (!orgId) {
    throw new Error('Tenant context is not set (missing OrgGuard / X-Org-Id?)')
  }
  return orgId
}
