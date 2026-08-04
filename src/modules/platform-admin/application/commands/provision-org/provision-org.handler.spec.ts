import type {
  ICommand,
  SagaContext,
  CompensationAction,
} from '@distributed-social-platform/shared-kernel'
import type { PinoLogger } from 'nestjs-pino'
import type { AuthProvisioningClient } from '@/infrastructure/grpc/auth-provisioning.client'
import { OwnerEmailAlreadyExistsError } from '@/common/errors/platform-admin.error'
import { ProvisionOrgHandler } from './provision-org.handler'
import { ProvisionOrgCommand } from './provision-org.command'

/**
 * Note what is NOT tested here any more: running compensations in reverse, and not
 * letting a compensation failure mask the original error, are guarantees of
 * CommandBus now (see command-bus.spec.ts) rather than of this handler. What
 * remains is the handler's own job — WHAT it undoes, and when it registers that.
 */
describe('ProvisionOrgHandler', () => {
  let handler: ProvisionOrgHandler
  let mockAuthClient: jest.Mocked<AuthProvisioningClient>
  let mockLogger: jest.Mocked<PinoLogger>
  let compensations: Array<() => Promise<void>>
  let actions: CompensationAction[]
  let dispatched: ICommand[]
  let ctx: SagaContext
  let dispatchResult: () => Promise<unknown>

  beforeEach(() => {
    mockAuthClient = {
      provisionUser: jest.fn(),
      cancelProvisionedUser: jest.fn(),
    } as unknown as jest.Mocked<AuthProvisioningClient>

    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>

    compensations = []
    actions = []
    dispatched = []
    dispatchResult = () => Promise.resolve('org-1')
    ctx = {
      dispatch: ((command: ICommand) => {
        dispatched.push(command)
        return dispatchResult()
      }) as SagaContext['dispatch'],
      onCompensate: (action, undo) => {
        actions.push(action)
        compensations.push(undo)
      },
    }

    handler = new ProvisionOrgHandler(mockAuthClient, mockLogger)
  })

  it('should declare itself a saga that dispatches only transactional org commands (never auto-retried)', () => {
    expect(handler.kind).toBe('saga')
    expect(handler.dispatches).toEqual(['CreateOrgCommand', 'ArchiveOrgCommand'])
  })

  it('should provision the owner then dispatch org creation, returning the combined result', async () => {
    mockAuthClient.provisionUser.mockResolvedValueOnce({
      userId: 'user-1',
      temporaryPassword: 'temp-pass',
    })

    const command = new ProvisionOrgCommand('Acme', 'acme', 'owner@acme.com', 'admin-1')
    const result = await handler.execute(command, ctx)

    expect(mockAuthClient.provisionUser).toHaveBeenCalledWith('owner@acme.com', undefined)
    expect(dispatched[0]).toEqual(
      expect.objectContaining({ orgName: 'Acme', slug: 'acme', ownerUserId: 'user-1' }),
    )
    expect(result).toEqual({
      orgId: 'org-1',
      ownerUserId: 'user-1',
      temporaryPassword: 'temp-pass',
    })
  })

  it('should thread the command idempotencyKey through to provisionUser', async () => {
    mockAuthClient.provisionUser.mockResolvedValueOnce({
      userId: 'user-1',
      temporaryPassword: 'temp-pass',
    })

    await handler.execute(
      new ProvisionOrgCommand('Acme', 'acme', 'owner@acme.com', 'admin-1', 'idem-key-1'),
      ctx,
    )

    expect(mockAuthClient.provisionUser).toHaveBeenCalledWith('owner@acme.com', 'idem-key-1')
  })

  it('should register the owner-cancellation compensation as soon as the owner exists', async () => {
    mockAuthClient.provisionUser.mockResolvedValueOnce({
      userId: 'user-1',
      temporaryPassword: 'temp-pass',
    })

    await handler.execute(new ProvisionOrgCommand('Acme', 'acme', 'owner@acme.com', 'admin-1'), ctx)

    // Registered even on the happy path — the bus only runs these if something fails.
    expect(compensations).toHaveLength(2)
    expect(actions[0]).toEqual({ type: 'cancel-provisioned-user', payload: { userId: 'user-1' } })
    await compensations[0]()
    expect(mockAuthClient.cancelProvisionedUser).toHaveBeenCalledWith('user-1')
  })

  it('should register org-archival as soon as the org exists, dispatched through the bus (not a repo)', async () => {
    mockAuthClient.provisionUser.mockResolvedValueOnce({
      userId: 'user-1',
      temporaryPassword: 'temp-pass',
    })

    await handler.execute(new ProvisionOrgCommand('Acme', 'acme', 'owner@acme.com', 'admin-1'), ctx)

    expect(compensations).toHaveLength(2)
    expect(actions[1]).toEqual({ type: 'archive-org', payload: { orgId: 'org-1' } })
    dispatched.length = 0 // only care about what the compensation itself dispatches
    await compensations[1]()
    expect(dispatched).toHaveLength(1)
    expect(dispatched[0]).toEqual(expect.objectContaining({ orgId: 'org-1' }))
  })

  it('should rethrow the original error when org creation fails, leaving compensation to the bus', async () => {
    mockAuthClient.provisionUser.mockResolvedValueOnce({
      userId: 'user-1',
      temporaryPassword: 'temp-pass',
    })
    const orgCreationError = new Error('ORG_SLUG_ALREADY_TAKEN')
    dispatchResult = () => Promise.reject(orgCreationError)

    await expect(
      handler.execute(new ProvisionOrgCommand('Acme', 'acme', 'owner@acme.com', 'admin-1'), ctx),
    ).rejects.toThrow(orgCreationError)

    // The handler does NOT cancel directly — it registered the undo and the bus
    // owns running it. Asserting that keeps the two from both doing it. Org
    // creation itself failed, so the org-archival compensation was never reached.
    expect(mockAuthClient.cancelProvisionedUser).not.toHaveBeenCalled()
    expect(compensations).toHaveLength(1)
  })

  it('nên ném OwnerEmailAlreadyExistsError và KHÔNG đăng ký compensation nào khi email đã tồn tại', async () => {
    // Client trả về tagged outcome (không throw) — handler tự diễn giải, đúng
    // layering như CreateOrgHandler/AcceptInviteHandler (2026-08-04).
    mockAuthClient.provisionUser.mockResolvedValueOnce({ alreadyExists: true })

    await expect(
      handler.execute(new ProvisionOrgCommand('Acme', 'acme', 'owner@acme.com', 'admin-1'), ctx),
    ).rejects.toThrow(OwnerEmailAlreadyExistsError)

    // Thất bại ngay ở bước 1 — chưa có user nào được tạo, không có gì để undo.
    expect(compensations).toHaveLength(0)
    expect(dispatched).toHaveLength(0)
    expect(mockAuthClient.cancelProvisionedUser).not.toHaveBeenCalled()
  })
})
