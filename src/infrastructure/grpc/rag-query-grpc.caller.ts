import { Injectable } from '@nestjs/common'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { CircuitBreaker } from '@distributed-social-platform/shared-kernel'

/**
 * SRP wrapper — the ONLY job of this class is running a call through the
 * 'rag-query-grpc' CircuitBreaker (resilience_patterns.md §3.1.2), same
 * convention as AuthProvisioningGrpcCaller.
 *
 * Note this breaker sits in FRONT of search-service, which has breakers of its
 * own around Elasticsearch/Ollama/Claude. Not redundant: those protect
 * search-service from its dependencies, this protects core-api's saga (and the
 * credit it is holding) from search-service itself being down or slow.
 */
@Injectable()
export class RagQueryGrpcCaller {
  private readonly breaker: CircuitBreaker

  constructor(@InjectPinoLogger(RagQueryGrpcCaller.name) logger: PinoLogger) {
    this.breaker = new CircuitBreaker('rag-query-grpc', logger)
  }

  call<T>(fn: () => Promise<T>): Promise<T> {
    return this.breaker.execute(fn)
  }
}
