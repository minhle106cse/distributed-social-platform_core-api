import { CommandBus } from '@distributed-social-platform/shared-kernel'
import type { PinoLogger } from 'nestjs-pino'
import type { AuthProvisioningClient } from '@/infrastructure/grpc/auth-provisioning.client'
import { ProvisionOrgHandler } from './provision-org.handler'
import { ProvisionOrgCommand } from './provision-org.command'

describe('ProvisionOrgHandler', () => {
  let handler: ProvisionOrgHandler
  let mockAuthClient: jest.Mocked<AuthProvisioningClient>
  let mockCommandBus: jest.Mocked<CommandBus>
  let mockLogger: jest.Mocked<PinoLogger>

  beforeEach(() => {
    mockAuthClient = {
      provisionUser: jest.fn(),
      cancelProvisionedUser: jest.fn(),
    } as unknown as jest.Mocked<AuthProvisioningClient>

    mockCommandBus = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CommandBus>

    mockLogger = {
      error: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>

    handler = new ProvisionOrgHandler(mockAuthClient, mockCommandBus, mockLogger)
  })

  it('should provision the owner then the org, returning the combined result', async () => {
    mockAuthClient.provisionUser.mockResolvedValueOnce({
      userId: 'user-1',
      temporaryPassword: 'temp-pass',
    })
    mockCommandBus.execute.mockResolvedValueOnce('org-1')

    const command = new ProvisionOrgCommand('Acme', 'acme', 'owner@acme.com')
    const result = await handler.execute(command)

    expect(mockAuthClient.provisionUser).toHaveBeenCalledWith('owner@acme.com')
    expect(mockCommandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgName: 'Acme', slug: 'acme', ownerUserId: 'user-1' }),
    )
    expect(result).toEqual({ orgId: 'org-1', ownerUserId: 'user-1', temporaryPassword: 'temp-pass' })
    expect(mockAuthClient.cancelProvisionedUser).not.toHaveBeenCalled()
  })

  it('should compensate by cancelling the provisioned owner when org creation fails, and rethrow the original error', async () => {
    mockAuthClient.provisionUser.mockResolvedValueOnce({
      userId: 'user-1',
      temporaryPassword: 'temp-pass',
    })
    const orgCreationError = new Error('ORG_SLUG_ALREADY_TAKEN')
    mockCommandBus.execute.mockRejectedValueOnce(orgCreationError)
    mockAuthClient.cancelProvisionedUser.mockResolvedValueOnce(undefined as never)

    const command = new ProvisionOrgCommand('Acme', 'acme', 'owner@acme.com')

    await expect(handler.execute(command)).rejects.toThrow(orgCreationError)
    expect(mockAuthClient.cancelProvisionedUser).toHaveBeenCalledWith('user-1')
  })

  it('should still rethrow the ORIGINAL error (not mask it) when the compensation call itself fails', async () => {
    mockAuthClient.provisionUser.mockResolvedValueOnce({
      userId: 'user-1',
      temporaryPassword: 'temp-pass',
    })
    const orgCreationError = new Error('ORG_SLUG_ALREADY_TAKEN')
    mockCommandBus.execute.mockRejectedValueOnce(orgCreationError)
    mockAuthClient.cancelProvisionedUser.mockRejectedValueOnce(new Error('grpc unavailable'))

    const command = new ProvisionOrgCommand('Acme', 'acme', 'owner@acme.com')

    await expect(handler.execute(command)).rejects.toThrow(orgCreationError)
    expect(mockLogger.error).toHaveBeenCalled()
  })
})
