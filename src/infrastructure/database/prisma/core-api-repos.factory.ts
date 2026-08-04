import { Injectable } from '@nestjs/common'
import type { IRepoFactory } from '@distributed-social-platform/shared-kernel'
import type { Prisma } from '@/generated'
import type { IKnowledgeItemRepository } from '@/modules/knowledge/domain/repositories/knowledge-item.repository'
import type { IRevisionRepository } from '@/modules/knowledge/domain/repositories/revision.repository'
import type { IOutboxAppender } from '@/infrastructure/outbox/outbox.repository'
import type { IBookmarkRepository } from '@/modules/engagement/domain/repositories/bookmark.repository'
import type { IFollowRepository } from '@/modules/engagement/domain/repositories/follow.repository'
import type { IVoteRepository } from '@/modules/engagement/domain/repositories/vote.repository'
import type { ISpaceRepository } from '@/modules/tenant/domain/repositories/space.repository'
import type { IOrganizationRepository } from '@/modules/tenant/domain/repositories/organization.repository'
import type { IMembershipRepository } from '@/modules/tenant/domain/repositories/membership.repository'
import type { IOrgInviteRepository } from '@/modules/tenant/domain/repositories/org-invite.repository'
import type { IOrgRolePermissionRepository } from '@/modules/tenant/domain/repositories/org-role-permission.repository'
import type { ICreditEventRepository } from '@/modules/credit/domain/repositories/credit-event.repository'
import { PrismaKnowledgeItemRepository } from '@/modules/knowledge/infrastructure/repositories/prisma-knowledge-item.repository'
import { PrismaRevisionRepository } from '@/modules/knowledge/infrastructure/repositories/prisma-revision.repository'
import { PrismaOutboxAppender } from '@/infrastructure/outbox/prisma-outbox-appender'
import { PrismaBookmarkRepository } from '@/modules/engagement/infrastructure/repositories/prisma-bookmark.repository'
import { PrismaFollowRepository } from '@/modules/engagement/infrastructure/repositories/prisma-follow.repository'
import { PrismaVoteRepository } from '@/modules/engagement/infrastructure/repositories/prisma-vote.repository'
import { PrismaSpaceRepository } from '@/modules/tenant/infrastructure/repositories/prisma-space.repository'
import { PrismaOrganizationRepository } from '@/modules/tenant/infrastructure/repositories/prisma-organization.repository'
import { PrismaMembershipRepository } from '@/modules/tenant/infrastructure/repositories/prisma-membership.repository'
import { PrismaOrgInviteRepository } from '@/modules/tenant/infrastructure/repositories/prisma-org-invite.repository'
import { PrismaOrgRolePermissionRepository } from '@/modules/tenant/infrastructure/repositories/prisma-org-role-permission.repository'
import { PrismaCreditEventRepository } from '@/modules/credit/infrastructure/repositories/prisma-credit-event.repository'

/**
 * Write-side Unit of Work for the WHOLE service (ADR-0001). One repos shape,
 * not one per module (Knowledge/Engagement/Tenant/Credit used to each have
 * their own TxScope + factory + registration) — collapsed 2026-07-30.
 *
 * The 4 old scopes already overlapped heavily and never really stood alone:
 * `items` (Knowledge+Engagement), `outbox` (Knowledge+Engagement — every
 * write-repo lives with the outbox appender, see IOutboxAppender's doc),
 * `spaces` (Engagement+Tenant), `memberships` (Tenant+Credit) were all
 * shared fields with identical types before this collapse. Splitting them
 * bought a soft protection (a handler in one module doesn't see another
 * module's repos on autocomplete) at the cost of upkeep (4 interfaces + 4
 * factories + 4 registrations to keep in sync, and "which scope does this
 * handler belong to" questions whenever a command needed repos from 2 old
 * scopes at once). See shared-kernel's tx-scope.ts doc for the full
 * reasoning.
 */
export interface CoreApiRepos {
  readonly items: IKnowledgeItemRepository
  readonly revisions: IRevisionRepository
  readonly outbox: IOutboxAppender
  readonly bookmarks: IBookmarkRepository
  readonly follows: IFollowRepository
  readonly votes: IVoteRepository
  readonly spaces: ISpaceRepository
  readonly organizations: IOrganizationRepository
  readonly memberships: IMembershipRepository
  readonly invites: IOrgInviteRepository
  readonly rolePermissions: IOrgRolePermissionRepository
  readonly creditEvents: ICreditEventRepository
}

/**
 * The only place write repositories are constructed — always from an open
 * transaction client, which is what makes "a write repository has a
 * transaction" true by construction rather than by convention (ADR-0001).
 */
@Injectable()
export class CoreApiRepoFactory implements IRepoFactory<CoreApiRepos, Prisma.TransactionClient> {
  create(tx: Prisma.TransactionClient): CoreApiRepos {
    return {
      items: new PrismaKnowledgeItemRepository(tx),
      revisions: new PrismaRevisionRepository(tx),
      outbox: new PrismaOutboxAppender(tx),
      bookmarks: new PrismaBookmarkRepository(tx),
      follows: new PrismaFollowRepository(tx),
      votes: new PrismaVoteRepository(tx),
      spaces: new PrismaSpaceRepository(tx),
      organizations: new PrismaOrganizationRepository(tx),
      memberships: new PrismaMembershipRepository(tx),
      invites: new PrismaOrgInviteRepository(tx),
      rolePermissions: new PrismaOrgRolePermissionRepository(tx),
      creditEvents: new PrismaCreditEventRepository(tx),
    }
  }
}
