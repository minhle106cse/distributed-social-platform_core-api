import { Injectable } from '@nestjs/common'
import type { IRepoFactory } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/common/database/core-api-repos'
import type { Prisma } from '@/generated'
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

// Re-exported for convenience at the construction site; the declaration lives in
// common/ so the application layer can name its scope without importing infrastructure.
export type { CoreApiRepos }
