import * as grpc from '@grpc/grpc-js'
import type { ConfigService } from '@nestjs/config'
import { AuthProvisioningUnavailableError } from '@/modules/platform-admin/domain/platform-admin.error'
import type { AuthProvisioningGrpcCaller } from './auth-provisioning-grpc.caller'

type ProvisionCallback = (
  err: (grpc.ServiceError & { code: grpc.status }) | null,
  response?: { userId: string; temporaryPassword: string },
) => void
type CancelCallback = (
  err: (grpc.ServiceError & { code: grpc.status }) | null,
  response?: { cancelled: boolean },
) => void

const mockGeneratedClient = {
  provisionUser: jest.fn(),
  cancelProvisionedUser: jest.fn(),
  close: jest.fn(),
}

jest.mock('@distributed-social-platform/shared-kernel', () => ({
  ...jest.requireActual('@distributed-social-platform/shared-kernel'),
  AuthProvisioningClient: jest.fn().mockImplementation(() => mockGeneratedClient),
}))

// Imported AFTER the mock so the class picks up the mocked generated client.
import { AuthProvisioningClient } from './auth-provisioning.client'

function grpcError(code: grpc.status): grpc.ServiceError & { code: grpc.status } {
  return Object.assign(new Error('grpc error'), {
    code,
    details: '',
    metadata: new grpc.Metadata(),
  })
}

describe('AuthProvisioningClient', () => {
  let client: AuthProvisioningClient
  let config: jest.Mocked<ConfigService>
  let caller: jest.Mocked<AuthProvisioningGrpcCaller>

  beforeEach(() => {
    jest.clearAllMocks()
    config = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'env.internalGrpcSharedSecret') return 'shared-secret'
        if (key === 'env.authGrpcUrl') return 'localhost:50052'
        throw new Error(`unexpected config key ${key}`)
      }),
    } as unknown as jest.Mocked<ConfigService>
    // Bypass the breaker entirely — its own behavior is covered by
    // circuit-breaker.spec.ts, not this client's job to re-test.
    caller = {
      call: jest.fn((fn: () => Promise<unknown>) => fn()),
    } as unknown as jest.Mocked<AuthProvisioningGrpcCaller>

    client = new AuthProvisioningClient(config, caller)
  })

  describe('provisionUser', () => {
    it('nên trả về ProvisionedOwner khi gRPC thành công', async () => {
      mockGeneratedClient.provisionUser.mockImplementation(
        (_req: unknown, _md: unknown, _opts: unknown, cb: ProvisionCallback) =>
          cb(null, { userId: 'user-1', temporaryPassword: 'temp-pass' }),
      )

      const result = await client.provisionUser('owner@acme.com')

      expect(result).toEqual({ userId: 'user-1', temporaryPassword: 'temp-pass' })
    })

    it('nên trả về { alreadyExists: true } khi gRPC trả ALREADY_EXISTS — KHÔNG throw, đây là data cho caller tự diễn giải', async () => {
      mockGeneratedClient.provisionUser.mockImplementation(
        (_req: unknown, _md: unknown, _opts: unknown, cb: ProvisionCallback) =>
          cb(grpcError(grpc.status.ALREADY_EXISTS)),
      )

      await expect(client.provisionUser('owner@acme.com')).resolves.toEqual({
        alreadyExists: true,
      })
    })

    it('nên ném AuthProvisioningUnavailableError với mọi mã lỗi gRPC khác ALREADY_EXISTS (lỗi hạ tầng thật)', async () => {
      mockGeneratedClient.provisionUser.mockImplementation(
        (_req: unknown, _md: unknown, _opts: unknown, cb: ProvisionCallback) =>
          cb(grpcError(grpc.status.UNAVAILABLE)),
      )

      await expect(client.provisionUser('owner@acme.com')).rejects.toThrow(
        AuthProvisioningUnavailableError,
      )
    })

    it('ALREADY_EXISTS resolve (không reject) bên trong caller.call — breaker không được tính đây là failure', async () => {
      mockGeneratedClient.provisionUser.mockImplementation(
        (_req: unknown, _md: unknown, _opts: unknown, cb: ProvisionCallback) =>
          cb(grpcError(grpc.status.ALREADY_EXISTS)),
      )

      await client.provisionUser('owner@acme.com')

      const wrappedFn = caller.call.mock.calls[0][0]
      await expect(wrappedFn()).resolves.toEqual({ alreadyExists: true })
    })
  })

  describe('cancelProvisionedUser', () => {
    it('nên trả về true khi huỷ thành công', async () => {
      mockGeneratedClient.cancelProvisionedUser.mockImplementation(
        (_req: unknown, _md: unknown, _opts: unknown, cb: CancelCallback) =>
          cb(null, { cancelled: true }),
      )

      await expect(client.cancelProvisionedUser('user-1')).resolves.toBe(true)
    })

    it('nên ném AuthProvisioningUnavailableError khi gRPC lỗi', async () => {
      mockGeneratedClient.cancelProvisionedUser.mockImplementation(
        (_req: unknown, _md: unknown, _opts: unknown, cb: CancelCallback) =>
          cb(grpcError(grpc.status.INTERNAL)),
      )

      await expect(client.cancelProvisionedUser('user-1')).rejects.toThrow(
        AuthProvisioningUnavailableError,
      )
    })
  })
})
