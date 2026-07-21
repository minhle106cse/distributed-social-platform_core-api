import { Module } from '@nestjs/common'
import { AuthProvisioningClient } from './auth-provisioning.client'
import { AuthProvisioningGrpcCaller } from './auth-provisioning-grpc.caller'
import { MembershipVerificationGrpcService } from './membership-verification.grpc-service'
import { GrpcServerBootstrap } from '@/bootstrap/grpc'

@Module({
  // Client side (core-api calling OUT to auth-service) + server side
  // (search-service/notification-service calling INTO core-api) both live
  // here — same "gRPC infra" concern, opposite direction of the same
  // transport.
  providers: [
    AuthProvisioningGrpcCaller,
    AuthProvisioningClient,
    MembershipVerificationGrpcService,
    GrpcServerBootstrap,
  ],
  exports: [AuthProvisioningClient, GrpcServerBootstrap],
})
export class GrpcModule {}
