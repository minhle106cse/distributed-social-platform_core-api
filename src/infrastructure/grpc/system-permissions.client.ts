import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as grpc from '@grpc/grpc-js'
import {
  CacheKeys,
  SystemRbacClient,
  attachInternalGrpcSecret,
  attachTraceparent,
  cachedLookup,
  getCurrentTraceparent,
  type ICacheStore,
} from '@distributed-social-platform/shared-kernel'
import { CACHE_STORE } from '@/infrastructure/cache/redis-cache.store'
import { SystemRbacGrpcCaller } from './system-rbac-grpc.caller'

const DEADLINE_MS = 3000
// Same 30s window as the membership cache. It bounds how long a REVOKED
// platform role keeps working — previously that window was the whole 15-minute
// access-token lifetime, with no way to shorten it short of shortening every
// token in the system.
const CACHE_TTL_MS = 30_000

// Whatever is in Redis is untrusted input, not necessarily what this class
// wrote: a malformed entry must read as a MISS, never crash an authz check and
// never be trusted as a permission list.
function parseCached(raw: string): string[] | undefined {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return undefined
    return parsed.filter((entry): entry is string => typeof entry === 'string')
  } catch {
    return undefined
  }
}

/**
 * Client half of proto/system-rbac.proto — resolves a caller's SYSTEM
 * permissions from auth_db, which owns System RBAC.
 *
 * Not promoted to shared-kernel (unlike MembershipVerifier): core-api is the
 * only consumer, so it fails reason B of `folder_structure_sop.md`
 * § Where An Abstraction Lives — "a service might need it later is not reason B".
 *
 * Cache reads/writes are best-effort by design: `ICacheStore` never throws, and
 * a miss simply costs one gRPC round-trip. What is NOT best-effort is the
 * lookup itself — if auth-service cannot be reached, this rejects and the guard
 * turns that into a 503. An authz check must never degrade to "allow".
 */
@Injectable()
export class SystemPermissionsClient implements OnModuleDestroy {
  private readonly client: SystemRbacClient
  private readonly sharedSecret: string

  constructor(
    config: ConfigService,
    private readonly caller: SystemRbacGrpcCaller,
    @Inject(CACHE_STORE) private readonly cache: ICacheStore,
  ) {
    this.client = new SystemRbacClient(
      config.getOrThrow<string>('env.authGrpcUrl'),
      grpc.credentials.createInsecure(),
    )
    this.sharedSecret = config.getOrThrow<string>('env.internalGrpcSharedSecret')
  }

  onModuleDestroy(): void {
    this.client.close()
  }

  private metadata(): grpc.Metadata {
    const metadata = attachInternalGrpcSecret(new grpc.Metadata(), this.sharedSecret)
    return attachTraceparent(metadata, getCurrentTraceparent())
  }

  async resolvePermissions(userId: string): Promise<string[]> {
    return cachedLookup({
      store: this.cache,
      key: CacheKeys.systemPermissions(userId),
      ttlMs: CACHE_TTL_MS,
      parse: parseCached,
      fetch: () => this.fetchPermissions(userId),
    })
  }

  private async fetchPermissions(userId: string): Promise<string[]> {
    return this.caller.call(
      () =>
        new Promise<string[]>((resolve, reject) => {
          this.client.resolveSystemPermissions(
            { userId },
            this.metadata(),
            { deadline: Date.now() + DEADLINE_MS },
            (err, response) => {
              if (err) {
                reject(err)
                return
              }
              resolve(response.permissions)
            },
          )
        }),
    )
  }
}
