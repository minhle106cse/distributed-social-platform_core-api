import { Injectable } from '@nestjs/common'
import {
  LogContext,
  logAudit,
  type ISagaCommandHandler,
  type SagaContext,
} from '@distributed-social-platform/shared-kernel'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { AuthProvisioningClient } from '@/infrastructure/grpc/auth-provisioning.client'
import { OwnerEmailAlreadyExistsError } from '@/common/errors/platform-admin.error'
import { CreateOrgCommand } from '@/modules/tenant/application/commands/create-org/create-org.command'
import { ArchiveOrgCommand } from '@/modules/tenant/application/commands/archive-org/archive-org.command'
import { ProvisionOrgCommand } from './provision-org.command'

export interface ProvisionOrgResult {
  orgId: string
  ownerUserId: string
  temporaryPassword: string
}

/**
 * The one saga in the system: it creates a user in auth-service (another DB, over
 * gRPC) and an org locally, which no single transaction can cover. Atomicity is
 * therefore replaced by compensation.
 *
 * Two things that used to be hand-rolled here are now guarantees of the bus:
 * running compensations in reverse, and never letting a compensation failure mask
 * the original error. What is left is the domain-specific part — WHAT to undo —
 * registered as a closure the moment the undoable thing exists, which is why
 * `userId` is in scope for it at all (ADR-0001 §2.2).
 *
 * Being a saga is also what keeps it out of the retry path: re-running it blindly
 * would provision a second owner account.
 */
@Injectable()
@CommandHandler(ProvisionOrgCommand)
export class ProvisionOrgHandler implements ISagaCommandHandler<
  ProvisionOrgCommand,
  ProvisionOrgResult
> {
  readonly kind = 'saga' as const
  readonly dispatches = [CreateOrgCommand.name, ArchiveOrgCommand.name]

  constructor(
    private readonly authProvisioningClient: AuthProvisioningClient,
    @InjectPinoLogger(ProvisionOrgHandler.name) private readonly logger: PinoLogger,
  ) {}

  async execute(command: ProvisionOrgCommand, ctx: SagaContext): Promise<ProvisionOrgResult> {
    // Step 1: provision the owner in auth-service (separate DB/service).
    // idempotencyKey threaded through so a genuine client retry recovers the
    // SAME user via auth-service's own record instead of orphaning a second
    // one (review of ADR-0001, 2026-07-30).
    const provisioned = await this.authProvisioningClient.provisionUser(
      command.ownerEmail,
      command.idempotencyKey,
    )
    // Client stays in transport vocabulary (returns a tagged outcome, doesn't
    // throw an application error itself) — same layering as
    // CreateOrgHandler/AcceptInviteHandler's own already-exists checks
    // (2026-08-04, review of the auth-provisioning DLQ/breaker audit). Thrown
    // before anything is registered for compensation, so there is nothing to
    // undo yet — no compensation runs for this branch.
    if ('alreadyExists' in provisioned) throw new OwnerEmailAlreadyExistsError()
    const { userId, temporaryPassword } = provisioned
    // Registered immediately after the side effect exists, so a failure in any
    // later step undoes it. A stray unverified user is a harmless orphan, but
    // leaving one behind is still a leak worth closing. Descriptor lets the
    // reaper re-run this from durable storage if the closure itself fails on
    // its first attempt (review of ADR-0001, 2026-07-30 — see
    // SagaCompensationRegistry for where 'cancel-provisioned-user' resolves to).
    ctx.onCompensate({ type: 'cancel-provisioned-user', payload: { userId } }, async () => {
      await this.authProvisioningClient.cancelProvisionedUser(userId)
    })

    try {
      // Step 2: create the org + OWNER membership locally. Dispatched through the
      // saga context — the only place a handler is allowed to send a command,
      // precisely because a saga holds no transaction for it to nest inside.
      const orgId = await ctx.dispatch<string>(
        new CreateOrgCommand(command.orgName, command.slug, userId),
      )
      // Registered the instant the org exists, mirroring the owner-user
      // compensation above. Without this, a failure between here and `return`
      // (however unlikely) left the org committed with an OWNER membership
      // pointing at a user the compensation above was about to cancel — an org
      // nobody could administer (review of ADR-0001, 2026-07-30). Runs through
      // `ctx.dispatch`, so it goes through the bus like any other command
      // (retried on a transient DB error, logged, etc.) rather than reaching for
      // a repository directly.
      ctx.onCompensate({ type: 'archive-org', payload: { orgId } }, async () => {
        await ctx.dispatch(new ArchiveOrgCommand(orgId))
      })
      // Highest blast-radius mutation in the system (own comment on
      // ProvisionOrgCommand) — real cross-service account creation, always audited.
      logAudit(this.logger, {
        action: 'platform.org_provisioned',
        outcome: 'success',
        actorUserId: command.actorUserId,
        targetUserId: userId,
        metadata: { orgId, orgName: command.orgName, slug: command.slug },
      })
      return { orgId, ownerUserId: userId, temporaryPassword }
    } catch (err) {
      this.logger.warn(
        { context: LogContext.COMMAND_BUS, userId, err },
        'Org creation failed after owner was provisioned — compensating',
      )
      logAudit(this.logger, {
        action: 'platform.org_provisioned',
        outcome: 'failure',
        actorUserId: command.actorUserId,
        targetUserId: userId,
        metadata: { orgName: command.orgName, slug: command.slug },
      })
      throw err
    }
  }
}
