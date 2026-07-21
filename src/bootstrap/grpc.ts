import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import * as grpc from '@grpc/grpc-js'
import { MembershipVerificationService } from '@distributed-social-platform/shared-kernel'
import { MembershipVerificationGrpcService } from '@/infrastructure/grpc/membership-verification.grpc-service'

/**
 * Assembles + starts the gRPC server. A real Nest provider — `membershipService`/
 * `config`/`logger` are all DI-resolved via the constructor, so main.ts just
 * does `app.get(GrpcServerBootstrap).start()` instead of manually fetching
 * each dependency and threading it through a plain function's parameter list.
 */
@Injectable()
export class GrpcServerBootstrap {
  constructor(
    private readonly membershipService: MembershipVerificationGrpcService,
    @InjectPinoLogger(GrpcServerBootstrap.name) private readonly logger: PinoLogger,
    private readonly config: ConfigService,
  ) {}

  start(): grpc.Server {
    const server = new grpc.Server()
    server.addService(MembershipVerificationService, this.membershipService)

    const port = this.config.getOrThrow<number>('env.coreGrpcPort')
    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (err, boundPort) => {
        if (err) {
          this.logger.error({ err }, 'Failed to start gRPC server')
          return
        }
        this.logger.info(`🔌 gRPC (MembershipVerification) listening on port ${boundPort}`)
      },
    )

    return server
  }
}
