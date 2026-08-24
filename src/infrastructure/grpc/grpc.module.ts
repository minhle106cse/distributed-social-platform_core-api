import { Global, Module } from '@nestjs/common'
import { AuthProvisioningClient } from './auth-provisioning.client'
import { AuthProvisioningGrpcCaller } from './auth-provisioning-grpc.caller'
import { MembershipVerificationGrpcService } from './membership-verification.grpc-service'
import { RagQueryClient } from './rag-query.client'
import { RagQueryGrpcCaller } from './rag-query-grpc.caller'
import { GrpcServerBootstrap } from '@/bootstrap/grpc'
import { AUTH_PROVISIONING_SERVICE } from '@/modules/platform-admin/domain/services/auth-provisioning.service'
import { RAG_QUERY_SERVICE } from '@/modules/credit/domain/services/rag-query.service'

/**
 * `@Global` + imported once by AppModule (2026-08-24) — like every other
 * service-wide infra module here (CqrsModule, KafkaModule, MessagingModule,
 * SagaCompensationModule, ScheduledJobsModule).
 *
 * It used to be imported by CreditModule and PlatformAdminModule only, for their
 * outbound CLIENTS — which meant this module's SERVER half (the
 * MembershipVerification service + GrpcServerBootstrap, started by
 * `main.ts` via `app.get(GrpcServerBootstrap)`) reached the injector graph purely
 * as a side effect of two feature modules needing to call OUT. Delete the AI-Query
 * saga and platform-admin provisioning and core-api silently stops being able to
 * SERVE gRPC — boot would fail on `app.get()` with nothing pointing at the cause.
 * Serving a transport is a service-level lifecycle concern, so it is wired at
 * service level.
 */
@Global()
@Module({
  // Client side (core-api calling OUT to auth-service) + server side
  // (search-service/notification-service calling INTO core-api) both live
  // here — same "gRPC infra" concern, opposite direction of the same
  // transport.
  providers: [
    AuthProvisioningGrpcCaller,
    AuthProvisioningClient,
    RagQueryGrpcCaller,
    RagQueryClient,
    MembershipVerificationGrpcService,
    GrpcServerBootstrap,
    // Both clients are exported ONLY behind their module's port token: the
    // Application layer must never see the concrete class (§6.1). `useExisting`,
    // not `useClass`, so the breaker state stays on one shared instance.
    { provide: AUTH_PROVISIONING_SERVICE, useExisting: AuthProvisioningClient },
    { provide: RAG_QUERY_SERVICE, useExisting: RagQueryClient },
  ],
  exports: [AUTH_PROVISIONING_SERVICE, RAG_QUERY_SERVICE, GrpcServerBootstrap],
})
export class GrpcModule {}
