import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import type { IRevisionRepository } from '@/modules/knowledge/domain/repositories/revision.repository'
import type { IOutboxWriter } from '@distributed-social-platform/shared-kernel'
import type { IBookmarkRepository } from '@/modules/engagement/domain/repositories/bookmark.repository'
import type { IFollowRepository } from '@/modules/engagement/domain/repositories/follow.repository'
import type { IVoteRepository } from '@/modules/engagement/domain/repositories/vote.repository'
import type { ISpaceRepository } from '@/modules/tenant/domain/repositories/space.repository'
import type { IOrganizationRepository } from '@/modules/tenant/domain/repositories/organization.repository'
import type { IMembershipRepository } from '@/modules/tenant/domain/repositories/membership.repository'
import type { IOrgInviteRepository } from '@/modules/tenant/domain/repositories/org-invite.repository'
import type { IOrgRolePermissionRepository } from '@/modules/tenant/domain/repositories/org-role-permission.repository'
import type { ICreditEventRepository } from '@/modules/credit/domain/repositories/credit-event.repository'
import type { IAiQueryRepository } from '@/modules/credit/domain/repositories/ai-query.repository'

/**
 * Write-side Unit of Work for the WHOLE service (ADR-0001). One repos shape,
 * not one per module (Knowledge/Engagement/Tenant/Credit used to each have
 * their own TxScope + factory + registration) — collapsed 2026-07-30.
 *
 * The 4 old scopes already overlapped heavily and never really stood alone:
 * `items` (Knowledge+Engagement), `outbox` (Knowledge+Engagement — every
 * write-repo lives with the outbox appender, see IOutboxWriter's doc),
 * `spaces` (Engagement+Tenant), `memberships` (Tenant+Credit) were all
 * shared fields with identical types before this collapse. Splitting them
 * bought a soft protection (a handler in one module doesn't see another
 * module's repos on autocomplete) at the cost of upkeep (4 interfaces + 4
 * factories + 4 registrations to keep in sync, and "which scope does this
 * handler belong to" questions whenever a command needed repos from 2 old
 * scopes at once). See shared-kernel's tx-scope.ts doc for the full
 * reasoning.
 *
 * WHY THIS SHAPE LIVES IN `common/`, NOT NEXT TO ITS FACTORY (moved 2026-08-21):
 * every `ITransactionalCommandHandler` needs this type as its `S` parameter, so
 * while it sat inside `core-api-repos.factory.ts` all 23 transactional handlers
 * had to import from `@/infrastructure/**` — which the application-layer eslint
 * boundary forbids, and which it had been reporting as 23 errors that nobody
 * read (they were 23 of the 261 pre-existing lint errors, all one root cause).
 * The type itself is pure abstraction — a bag of domain repository interfaces
 * with no Prisma/ORM type anywhere — so `common/` is where it belongs, and the
 * factory that CONSTRUCTS these repos stays in `infrastructure/` where it
 * belongs. search-service and notification-service already kept their scope
 * type out of infrastructure (in `domain/`, which works there because each is a
 * single-module service); core-api spans 6 modules so no single module's
 * `domain/` can own it, and `common/` is the cross-module abstraction home.
 */
export interface CoreApiRepos {
  readonly items: IKnowledgeItemRepository
  readonly revisions: IRevisionRepository
  readonly outbox: IOutboxWriter
  readonly bookmarks: IBookmarkRepository
  readonly follows: IFollowRepository
  readonly votes: IVoteRepository
  readonly spaces: ISpaceRepository
  readonly organizations: IOrganizationRepository
  readonly memberships: IMembershipRepository
  readonly invites: IOrgInviteRepository
  readonly rolePermissions: IOrgRolePermissionRepository
  readonly creditEvents: ICreditEventRepository
  readonly aiQueries: IAiQueryRepository
}
