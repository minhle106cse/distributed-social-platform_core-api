import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { ExecutionContext } from '@nestjs/common'
import { SystemPermission } from '@distributed-social-platform/shared-kernel'
import { SystemPermissionGuard } from './system-permission.guard'
import { SYSTEM_PERMISSION_KEY } from '@/infrastructure/http/decorators/require-system-permission.decorator'
import type { SystemPermissionsClient } from '@/infrastructure/grpc/system-permissions.client'

// Stand-ins for the route method and its controller class — Reflector reads
// metadata off these two objects, so real ones are unnecessary.
const handlerRef = function routeHandler(): void {}
const classRef = class ControllerRef {}

function contextWith(user?: { sub?: string }): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => handlerRef,
    getClass: () => classRef,
  } as unknown as ExecutionContext
}

function buildGuard(
  metadata: Record<string, unknown>,
  resolve: () => Promise<string[]>,
): SystemPermissionGuard {
  const reflector = new Reflector()
  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockImplementation((key: unknown) => metadata[key as string])
  const client = { resolvePermissions: resolve } as unknown as SystemPermissionsClient
  return new SystemPermissionGuard(reflector, client)
}

const NEEDS_ORG_CREATE = { [SYSTEM_PERMISSION_KEY]: [SystemPermission.ORG_CREATE] }

describe('SystemPermissionGuard', () => {
  it('allows a caller whose RESOLVED permissions include the declared one', async () => {
    const guard = buildGuard(NEEDS_ORG_CREATE, async () => [SystemPermission.ORG_CREATE])
    await expect(guard.canActivate(contextWith({ sub: 'user-1' }))).resolves.toBe(true)
  })

  it('rejects a caller whose resolved permissions lack the declared one', async () => {
    const guard = buildGuard(NEEDS_ORG_CREATE, async () => [SystemPermission.ORG_READ])
    await expect(guard.canActivate(contextWith({ sub: 'user-1' }))).rejects.toThrow(
      ForbiddenException,
    )
  })

  // The whole point of moving off the JWT claim: the token can still carry a
  // stale permission, but the DB is what decides.
  it('ignores the JWT permissions claim entirely — the resolved list is authoritative', async () => {
    const guard = buildGuard(NEEDS_ORG_CREATE, async () => [])
    const staleToken = { sub: 'user-1', permissions: [SystemPermission.ORG_CREATE] }
    await expect(guard.canActivate(contextWith(staleToken))).rejects.toThrow(ForbiddenException)
  })

  // An authz check that degrades to "allow" when its source is down is worse
  // than no check at all.
  it('FAILS CLOSED with 503 when auth-service cannot be reached', async () => {
    const guard = buildGuard(NEEDS_ORG_CREATE, async () => {
      throw new Error('breaker open')
    })
    await expect(guard.canActivate(contextWith({ sub: 'user-1' }))).rejects.toThrow(
      ServiceUnavailableException,
    )
  })

  // This tier has no membership floor to fall back on: before 2026-08-25 an
  // undeclared route returned `true`, so ANY authenticated user reached it.
  it('FAILS CLOSED when the route declares no permission, instead of admitting everyone', async () => {
    const guard = buildGuard({}, async () => [])
    await expect(guard.canActivate(contextWith({ sub: 'user-1' }))).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('fails closed on a missing declaration even for a caller holding every permission', async () => {
    const guard = buildGuard({}, async () => Object.values(SystemPermission))
    await expect(guard.canActivate(contextWith({ sub: 'user-1' }))).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('does not even attempt a lookup when the route declares nothing', async () => {
    const resolve = jest.fn(async () => [] as string[])
    const guard = buildGuard({}, resolve)
    await expect(guard.canActivate(contextWith({ sub: 'user-1' }))).rejects.toThrow(
      ForbiddenException,
    )
    expect(resolve).not.toHaveBeenCalled()
  })

  // Variadic, matching RemoteOrgMembershipGuard: several declared permissions
  // mean ALL of them, never any-of. No system-tier route needs this today, but
  // the two decorators were made the same shape on purpose (2026-08-25).
  it('requires ALL declared permissions (AND), not just one of them', async () => {
    const guard = buildGuard(
      { [SYSTEM_PERMISSION_KEY]: [SystemPermission.ORG_CREATE, SystemPermission.ORG_READ] },
      async () => [SystemPermission.ORG_CREATE],
    )
    await expect(guard.canActivate(contextWith({ sub: 'user-1' }))).rejects.toThrow(
      /Missing system permission: org:read/,
    )
  })

  it('allows when every declared permission is present', async () => {
    const guard = buildGuard(
      { [SYSTEM_PERMISSION_KEY]: [SystemPermission.ORG_CREATE, SystemPermission.ORG_READ] },
      async () => [SystemPermission.ORG_CREATE, SystemPermission.ORG_READ],
    )
    await expect(guard.canActivate(contextWith({ sub: 'user-1' }))).resolves.toBe(true)
  })

  it('treats @RequireSystemPermission() with zero arguments as no declaration at all', async () => {
    const guard = buildGuard({ [SYSTEM_PERMISSION_KEY]: [] }, async () =>
      Object.values(SystemPermission),
    )
    await expect(guard.canActivate(contextWith({ sub: 'user-1' }))).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('rejects when there is no authenticated user on the request', async () => {
    const guard = buildGuard(NEEDS_ORG_CREATE, async () => [SystemPermission.ORG_CREATE])
    await expect(guard.canActivate(contextWith(undefined))).rejects.toThrow(UnauthorizedException)
  })

  // getAllAndOverride, not get: with the old reflector.get(…, getHandler()) a
  // class-level decorator read as "not declared" — silently, with no error.
  it('reads the permission declared at CLASS level, not only at method level', async () => {
    const reflector = new Reflector()
    const seen: unknown[][] = []
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((_key, targets) => {
      seen.push(targets as unknown[])
      return [SystemPermission.ORG_READ]
    })
    const client = {
      resolvePermissions: async () => [SystemPermission.ORG_READ],
    } as unknown as SystemPermissionsClient

    await expect(
      new SystemPermissionGuard(reflector, client).canActivate(contextWith({ sub: 'user-1' })),
    ).resolves.toBe(true)
    expect(seen[0]).toEqual([handlerRef, classRef])
  })
})
