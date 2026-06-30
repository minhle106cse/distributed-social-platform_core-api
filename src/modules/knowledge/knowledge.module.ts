import { Module } from '@nestjs/common'
import { TenantModule } from '@/modules/tenant/tenant.module'
import { OutboxModule } from '@/modules/outbox/outbox.module'
import { KNOWLEDGE_ITEM_REPOSITORY } from './domain/repositories/knowledge-item.repository'
import { REVISION_REPOSITORY } from './domain/repositories/revision.repository'
import { KNOWLEDGE_QUERY_REPOSITORY } from './application/queries/knowledge.query-repository'
import { CreateKnowledgeHandler } from './application/commands/create-knowledge/create-knowledge.handler'
import { UpdateKnowledgeHandler } from './application/commands/update-knowledge/update-knowledge.handler'
import { PublishKnowledgeHandler } from './application/commands/publish-knowledge/publish-knowledge.handler'
import { VerifyKnowledgeHandler } from './application/commands/verify-knowledge/verify-knowledge.handler'
import { DeleteKnowledgeHandler } from './application/commands/delete-knowledge/delete-knowledge.handler'
import { GetKnowledgeItemHandler } from './application/queries/get-knowledge-item/get-knowledge-item.handler'
import { ListKnowledgeItemsHandler } from './application/queries/list-knowledge-items/list-knowledge-items.handler'
import { ListRevisionsHandler } from './application/queries/list-revisions/list-revisions.handler'
import { PrismaKnowledgeItemRepository } from './infrastructure/repositories/prisma-knowledge-item.repository'
import { PrismaRevisionRepository } from './infrastructure/repositories/prisma-revision.repository'
import { PrismaKnowledgeQueryRepository } from './infrastructure/repositories/prisma-knowledge.query-repository'
import { KnowledgeController } from './presentation/controllers/knowledge.controller'

@Module({
  imports: [TenantModule, OutboxModule],
  controllers: [KnowledgeController],
  exports: [KNOWLEDGE_ITEM_REPOSITORY, KNOWLEDGE_QUERY_REPOSITORY],
  providers: [
    // Command handlers
    CreateKnowledgeHandler,
    UpdateKnowledgeHandler,
    PublishKnowledgeHandler,
    VerifyKnowledgeHandler,
    DeleteKnowledgeHandler,
    // Query handlers
    GetKnowledgeItemHandler,
    ListKnowledgeItemsHandler,
    ListRevisionsHandler,
    // Write repositories
    { provide: KNOWLEDGE_ITEM_REPOSITORY, useClass: PrismaKnowledgeItemRepository },
    { provide: REVISION_REPOSITORY, useClass: PrismaRevisionRepository },
    // Read repository (query side)
    { provide: KNOWLEDGE_QUERY_REPOSITORY, useClass: PrismaKnowledgeQueryRepository },
  ],
})
export class KnowledgeModule {}
