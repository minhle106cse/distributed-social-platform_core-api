import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as grpc from '@grpc/grpc-js'
import {
  RagQueryClient as GeneratedRagQueryClient,
  type RagQueryClient as IGeneratedRagQueryClient,
  RagOutcome,
  attachInternalGrpcSecret,
  attachTraceparent,
  getCurrentTraceparent,
} from '@distributed-social-platform/shared-kernel'
import { RagQueryGrpcCaller } from './rag-query-grpc.caller'
import type {
  IRagQueryService,
  RagQueryOutcome,
} from '@/modules/credit/domain/services/rag-query.service'

// Longer than the other internal calls (5s for auth provisioning, 3s for
// membership): this one waits on embedding + Elasticsearch + an LLM round-trip.
const DEADLINE_MS = 30_000

/**
 * Client side of proto/ai-query.proto — core-api → search-service, the paid RAG
 * path of the AI-Query Saga. Same hand-rolled convention as
 * AuthProvisioningClient: ts-proto types, shared-secret metadata, traceparent
 * propagation, per-call deadline, circuit breaker.
 *
 * The ADAPTER for `IRagQueryService` (`modules/credit/domain/services/`). It stays
 * in the service-wide `infrastructure/grpc/` rather than
 * `modules/credit/infrastructure/services/` because everything gRPC in core-api is
 * wired here — the shared secret, the breaker-wrapping callers, GrpcModule and the
 * server bootstrap. What matters for the boundary is where the PORT lives, and
 * that is inside the module that consumes it.
 */
@Injectable()
export class RagQueryClient implements IRagQueryService, OnModuleDestroy {
  private readonly client: IGeneratedRagQueryClient
  private readonly sharedSecret: string

  constructor(
    config: ConfigService,
    private readonly caller: RagQueryGrpcCaller,
  ) {
    this.sharedSecret = config.getOrThrow<string>('env.internalGrpcSharedSecret')
    this.client = new GeneratedRagQueryClient(
      config.getOrThrow<string>('env.searchGrpcUrl'),
      grpc.credentials.createInsecure(),
    )
  }

  onModuleDestroy(): void {
    this.client.close()
  }

  private metadata(): grpc.Metadata {
    const metadata = attachInternalGrpcSecret(new grpc.Metadata(), this.sharedSecret)
    return attachTraceparent(metadata, getCurrentTraceparent())
  }

  async query(orgId: string, question: string, topK: number): Promise<RagQueryOutcome> {
    return this.caller.call(
      () =>
        new Promise<RagQueryOutcome>((resolve, reject) => {
          this.client.query(
            { orgId, question, topK },
            this.metadata(),
            { deadline: Date.now() + DEADLINE_MS },
            (err, response) => {
              if (err) {
                reject(err)
                return
              }

              const chunks = response.chunks.map((chunk) => ({
                knowledgeItemId: chunk.knowledgeItemId,
                titleSnapshot: chunk.titleSnapshot,
                content: chunk.content,
                score: chunk.score,
              }))

              if (response.outcome === RagOutcome.RAG_OUTCOME_ANSWERED) {
                resolve({
                  status: 'ANSWERED',
                  summary: response.summary,
                  sources: response.sources.map((source) => ({
                    knowledgeItemId: source.knowledgeItemId,
                    title: source.title,
                  })),
                  chunks,
                })
                return
              }
              if (response.outcome === RagOutcome.RAG_OUTCOME_NO_RESULTS) {
                resolve({ status: 'NO_RESULTS' })
                return
              }
              // UNSPECIFIED lands here too: an outcome this client does not
              // understand must fail closed (no charge), never be treated as an
              // answer the user paid for.
              resolve({ status: 'AI_UNAVAILABLE', chunks })
            },
          )
        }),
    )
  }
}
