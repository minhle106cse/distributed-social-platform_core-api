import { Module } from '@nestjs/common'
import { AuthProvisioningClient } from './auth-provisioning.client'

@Module({
  providers: [AuthProvisioningClient],
  exports: [AuthProvisioningClient],
})
export class GrpcModule {}
