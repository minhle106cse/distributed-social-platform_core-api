import type { ConfigService } from '@nestjs/config'
import type { PinoLogger } from 'nestjs-pino'
import type { QueryBus } from '@distributed-social-platform/shared-kernel'
import { MembershipVerificationGrpcService } from './membership-verification.grpc-service'

function buildCall(secret: string | undefined, request: Record<string, unknown> = {}) {
  return {
    metadata: {
      get: (key: string) => (key === 'x-internal-secret' && secret !== undefined ? [secret] : []),
    },
    request,
  } as any
}

describe('MembershipVerificationGrpcService — internal-secret rejection logging (2026-07-25, previously silent)', () => {
  const SHARED_SECRET = 'test-shared-secret'
  let mockQueryBus: jest.Mocked<QueryBus>
  let mockLogger: jest.Mocked<PinoLogger>
  let mockConfig: jest.Mocked<ConfigService>
  let service: MembershipVerificationGrpcService

  beforeEach(() => {
    mockQueryBus = { execute: jest.fn() } as unknown as jest.Mocked<QueryBus>
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>
    mockConfig = {
      getOrThrow: jest.fn().mockReturnValue(SHARED_SECRET),
    } as unknown as jest.Mocked<ConfigService>
    service = new MembershipVerificationGrpcService(mockQueryBus, mockLogger, mockConfig)
  })

  it('logs a warn and rejects when the internal secret is wrong', async () => {
    const callback = jest.fn()
    service.checkMembership(buildCall('wrong-secret', { orgId: 'o1', userId: 'u1' }), callback)
    await new Promise((r) => setImmediate(r))

    expect(mockQueryBus.execute).not.toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ context: 'GrpcLayer' }),
      expect.stringContaining('invalid internal secret'),
    )
  })

  it('does NOT log the rejection warn when the secret is correct', async () => {
    mockQueryBus.execute.mockResolvedValueOnce({ isMember: true })
    const callback = jest.fn()
    service.checkMembership(buildCall(SHARED_SECRET, { orgId: 'o1', userId: 'u1' }), callback)
    await new Promise((r) => setImmediate(r))

    expect(mockLogger.warn).not.toHaveBeenCalled()
  })
})
