import { randomUUID } from 'crypto'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  LogContext,
  logAudit,
  type ISagaCommandHandler,
  type SagaContext,
} from '@distributed-social-platform/shared-kernel'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { AiUnavailableError } from '@/modules/credit/domain/credit.error'
import {
  RAG_QUERY_SERVICE,
  type IRagQueryService,
} from '@/modules/credit/domain/services/rag-query.service'
import { ReserveCreditsCommand } from '../reserve-credits/reserve-credits.command'
import { CommitAiQueryCommand } from '../commit-ai-query/commit-ai-query.command'
import type { CommitAiQueryResult } from '../commit-ai-query/commit-ai-query.handler'
import { ReleaseCreditReservationCommand } from '../release-credit-reservation/release-credit-reservation.command'
import type { ReleaseCreditReservationResult } from '../release-credit-reservation/release-credit-reservation.handler'
import { AskAiCommand } from './ask-ai.command'

export interface AskAiResult {
  aiQueryId: string | null
  /** Null when the knowledge base had nothing to answer from (NO_RESULTS). */
  answer: string | null
  sources: Array<{ knowledgeItemId: string; title: string }>
  /** 0 unless the answer was actually delivered. */
  creditCost: number
  balance: number
}

const RELEASE_ACTION_TYPE = 'release-credit-reservation'

/**
 * The system's SECOND saga (after ProvisionOrgHandler), and the one the whole
 * saga machinery was built for: reserve credit → call RAG over gRPC → commit.
 *
 *   ① ReserveCreditsCommand      — hold the credit (throws 402 before anything
 *                                  is registered for compensation)
 *   ② IRagQueryService.query()   — the only step outside any transaction
 *   ③ CommitAiQueryCommand       — charge + store the answer + emit CreditSpent,
 *                                  all in ONE transaction (see that command's doc)
 *
 * Being a saga is also what keeps it out of the retry path: a blind re-run would
 * reserve a second time against the same wallet.
 */
@Injectable()
@CommandHandler(AskAiCommand)
export class AskAiHandler implements ISagaCommandHandler<AskAiCommand, AskAiResult> {
  readonly kind = 'saga' as const
  readonly dispatches = [
    ReserveCreditsCommand.name,
    CommitAiQueryCommand.name,
    ReleaseCreditReservationCommand.name,
  ]

  private readonly creditCost: number

  constructor(
    @Inject(RAG_QUERY_SERVICE) private readonly ragQuery: IRagQueryService,
    config: ConfigService,
    @InjectPinoLogger(AskAiHandler.name) private readonly logger: PinoLogger,
  ) {
    this.creditCost = config.getOrThrow<number>('env.aiQueryCreditCost')
  }

  async execute(command: AskAiCommand, ctx: SagaContext): Promise<AskAiResult> {
    const reservationId = randomUUID()
    const { orgId, userId, question } = command

    // ① Throws InsufficientCreditsError (402) when `available` is short. Nothing
    // is registered for compensation yet, so that branch undoes nothing.
    await ctx.dispatch(
      new ReserveCreditsCommand(orgId, userId, reservationId, this.creditCost, 'AI query'),
    )

    // Registered the instant the hold exists, before the call that can fail —
    // same discipline as ProvisionOrgHandler. The descriptor (not just the
    // closure) is what lets SagaCompensationReaperService re-run this from
    // durable storage if the closure itself fails; the runner is registered in
    // CreditModule.onModuleInit under RELEASE_ACTION_TYPE.
    ctx.onCompensate(
      {
        type: RELEASE_ACTION_TYPE,
        payload: { orgId, userId, reservationId, question, reason: 'AI_UNAVAILABLE' },
      },
      async () => {
        await ctx.dispatch(
          new ReleaseCreditReservationCommand(
            orgId,
            userId,
            reservationId,
            question,
            'AI_UNAVAILABLE',
          ),
        )
      },
    )

    // ② The one step no transaction covers.
    const rag = await this.ragQuery.query(orgId, question, command.topK)

    // Nothing to answer from is NOT a failure of the AI, and not something to
    // charge for. Released explicitly (with its own reason, so the notification
    // consumer can stay quiet about it) and returned as a normal 200 — throwing
    // here would surface an infrastructure error for an empty knowledge base.
    if (rag.status === 'NO_RESULTS') {
      const released = await ctx.dispatch<ReleaseCreditReservationResult>(
        new ReleaseCreditReservationCommand(orgId, userId, reservationId, question, 'NO_RESULTS'),
      )
      return {
        aiQueryId: released.aiQueryId,
        answer: null,
        sources: [],
        creditCost: 0,
        balance: released.balance,
      }
    }

    // Retrieval worked but the summarizer did not: the user would be paying for
    // an answer they are not getting. Throwing hands control to the bus, which
    // runs the compensation stack above (503 + the chunks as a fallback, UC-C2).
    if (rag.status === 'AI_UNAVAILABLE') {
      this.logger.warn(
        { context: LogContext.COMMAND_BUS, orgId, userId, reservationId },
        'RAG degraded to chunks-only — releasing credit reservation',
      )
      logAudit(this.logger, {
        action: 'credit.ai_query',
        outcome: 'failure',
        actorUserId: userId,
        metadata: { orgId, reservationId, reason: 'AI_UNAVAILABLE' },
      })
      throw new AiUnavailableError(
        rag.chunks.map((chunk) => ({
          knowledgeItemId: chunk.knowledgeItemId,
          title: chunk.titleSnapshot,
          snippet: chunk.content.slice(0, 300),
        })),
      )
    }

    // ③ Commit + persist + emit, atomically.
    const committed = await ctx.dispatch<CommitAiQueryResult>(
      new CommitAiQueryCommand(
        orgId,
        userId,
        reservationId,
        question,
        rag.summary,
        rag.sources,
        this.creditCost,
        'AI query',
      ),
    )

    logAudit(this.logger, {
      action: 'credit.ai_query',
      outcome: 'success',
      actorUserId: userId,
      metadata: { orgId, reservationId, aiQueryId: committed.aiQueryId, cost: this.creditCost },
    })

    return {
      aiQueryId: committed.aiQueryId,
      answer: rag.summary,
      sources: rag.sources,
      creditCost: this.creditCost,
      balance: committed.balance,
    }
  }
}
