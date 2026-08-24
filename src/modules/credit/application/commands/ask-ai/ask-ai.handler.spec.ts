import type {
  ICommand,
  SagaContext,
  CompensationAction,
} from '@distributed-social-platform/shared-kernel'
import type { ConfigService } from '@nestjs/config'
import type { PinoLogger } from 'nestjs-pino'
import type {
  IRagQueryService,
  RagQueryOutcome,
} from '@/modules/credit/domain/services/rag-query.service'
import { AiUnavailableError, InsufficientCreditsError } from '@/modules/credit/domain/credit.error'
import { AskAiHandler } from './ask-ai.handler'
import { AskAiCommand } from './ask-ai.command'

const CREDIT_COST = 3

/**
 * Chạy compensation ngược thứ tự và không để lỗi compensation che lỗi gốc là bảo
 * đảm của CommandBus (command-bus.spec.ts), không phải của handler này. Ở đây chỉ
 * kiểm phần việc riêng của saga: undo CÁI GÌ, đăng ký LÚC NÀO, và kết cục nào thì
 * được tính tiền.
 */
describe('AskAiHandler', () => {
  let handler: AskAiHandler
  let mockRagClient: jest.Mocked<IRagQueryService>
  let mockLogger: jest.Mocked<PinoLogger>
  let compensations: Array<() => Promise<void>>
  let actions: CompensationAction[]
  let dispatched: ICommand[]
  let ctx: SagaContext

  const dispatchResults = new Map<string, unknown>()

  beforeEach(() => {
    mockRagClient = { query: jest.fn() }
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>

    compensations = []
    actions = []
    dispatched = []
    dispatchResults.clear()
    dispatchResults.set('CommitAiQueryCommand', { aiQueryId: 'q-1', balance: 47 })
    dispatchResults.set('ReleaseCreditReservationCommand', {
      released: true,
      balance: 50,
      aiQueryId: 'q-failed',
    })

    ctx = {
      dispatch: ((command: ICommand) => {
        dispatched.push(command)
        return Promise.resolve(dispatchResults.get(command.name))
      }) as SagaContext['dispatch'],
      onCompensate: (action, undo) => {
        actions.push(action)
        compensations.push(undo)
      },
    }

    const config = { getOrThrow: () => CREDIT_COST } as unknown as ConfigService
    handler = new AskAiHandler(mockRagClient, config, mockLogger)
  })

  const command = () => new AskAiCommand('org-1', 'user-1', 'rotate JWT secret?', 5)

  it('nên khai báo là saga (không bao giờ auto-retry) và liệt kê đúng command nó dispatch', () => {
    expect(handler.kind).toBe('saga')
    expect(handler.dispatches).toEqual([
      'ReserveCreditsCommand',
      'CommitAiQueryCommand',
      'ReleaseCreditReservationCommand',
    ])
  })

  it('happy path: reserve → RAG → commit, đúng thứ tự, và trả về cost đã tính', async () => {
    mockRagClient.query.mockResolvedValue({
      status: 'ANSWERED',
      summary: 'Dùng key rotation…',
      sources: [{ knowledgeItemId: 'k-1', title: 'Deploy Guide' }],
      chunks: [],
    } satisfies RagQueryOutcome)

    const result = await handler.execute(command(), ctx)

    expect(dispatched.map((c) => c.name)).toEqual(['ReserveCreditsCommand', 'CommitAiQueryCommand'])
    expect(result).toEqual({
      aiQueryId: 'q-1',
      answer: 'Dùng key rotation…',
      sources: [{ knowledgeItemId: 'k-1', title: 'Deploy Guide' }],
      creditCost: CREDIT_COST,
      balance: 47,
    })
  })

  it('nên đăng ký compensation NGAY sau khi reserve, trước khi gọi RAG', async () => {
    let compensationsAtCallTime = -1
    mockRagClient.query.mockImplementation(() => {
      compensationsAtCallTime = actions.length
      return Promise.resolve({ status: 'NO_RESULTS' } satisfies RagQueryOutcome)
    })

    await handler.execute(command(), ctx)

    // Nếu đăng ký sau khi gọi RAG thì một crash giữa chừng để lại hold vĩnh viễn.
    expect(compensationsAtCallTime).toBe(1)
    expect(actions[0].type).toBe('release-credit-reservation')
    expect(actions[0].payload).toMatchObject({
      orgId: 'org-1',
      userId: 'user-1',
      reason: 'AI_UNAVAILABLE',
      question: 'rotate JWT secret?',
    })
  })

  it('reserve fail (hết credit) → KHÔNG đăng ký compensation nào, không gọi RAG', async () => {
    ctx.dispatch = () => Promise.reject(new InsufficientCreditsError(0, CREDIT_COST))

    await expect(handler.execute(command(), ctx)).rejects.toThrow(InsufficientCreditsError)

    // Chưa có gì tồn tại để undo — đăng ký thừa ở đây sẽ khiến reaper chạy một
    // release cho reservation chưa từng được tạo.
    expect(actions).toEqual([])
    expect(mockRagClient.query).not.toHaveBeenCalled()
  })

  it('AI_UNAVAILABLE → throw AiUnavailableError (bus chạy compensation), KHÔNG commit', async () => {
    mockRagClient.query.mockResolvedValue({
      status: 'AI_UNAVAILABLE',
      chunks: [
        { knowledgeItemId: 'k-1', titleSnapshot: 'Deploy Guide', content: 'nội dung', score: 0.9 },
      ],
    } satisfies RagQueryOutcome)

    await expect(handler.execute(command(), ctx)).rejects.toThrow(AiUnavailableError)

    expect(dispatched.map((c) => c.name)).toEqual(['ReserveCreditsCommand'])
    expect(actions).toHaveLength(1)
  })

  it('AI_UNAVAILABLE → lỗi mang theo chunks làm fallback cho client (UC-C2)', async () => {
    mockRagClient.query.mockResolvedValue({
      status: 'AI_UNAVAILABLE',
      chunks: [
        { knowledgeItemId: 'k-1', titleSnapshot: 'Deploy Guide', content: 'nội dung', score: 0.9 },
      ],
    } satisfies RagQueryOutcome)

    const err = await handler.execute(command(), ctx).catch((e: unknown) => e)

    expect(err).toBeInstanceOf(AiUnavailableError)
    expect((err as AiUnavailableError).details).toEqual({
      fallbackChunks: [{ knowledgeItemId: 'k-1', title: 'Deploy Guide', snippet: 'nội dung' }],
    })
  })

  it('NO_RESULTS → 200 với answer null, release với lý do riêng, KHÔNG tính credit', async () => {
    mockRagClient.query.mockResolvedValue({ status: 'NO_RESULTS' } satisfies RagQueryOutcome)

    const result = await handler.execute(command(), ctx)

    // Knowledge base rỗng không phải sự cố AI: không throw, nên compensation
    // đã đăng ký không chạy — release được dispatch tường minh với reason khác.
    const release = dispatched.find((c) => c.name === 'ReleaseCreditReservationCommand')
    expect(release).toMatchObject({ reason: 'NO_RESULTS' })
    expect(dispatched.some((c) => c.name === 'CommitAiQueryCommand')).toBe(false)
    expect(result).toEqual({
      aiQueryId: 'q-failed',
      answer: null,
      sources: [],
      creditCost: 0,
      balance: 50,
    })
  })
})
