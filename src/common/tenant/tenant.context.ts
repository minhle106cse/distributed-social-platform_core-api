import { AsyncLocalStorage } from 'async_hooks'

const tenantContext = new AsyncLocalStorage<string>()

export function getTenantId(): string | undefined {
  return tenantContext.getStore()
}

export function runWithTenant<R>(orgId: string, callback: () => R): R {
  return tenantContext.run(orgId, callback)
}
