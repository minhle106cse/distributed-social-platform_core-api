import { Module } from '@nestjs/common'
import { TenantModule } from '@/modules/tenant/tenant.module'
import { KNOWLEDGE_QUERY_REPOSITORY } from './application/queries/knowledge.query-repository'
import { CreateKnowledgeHandler } from './application/commands/create-knowledge/create-knowledge.handler'
import { UpdateKnowledgeHandler } from './application/commands/update-knowledge/update-knowledge.handler'
import { PublishKnowledgeHandler } from './application/commands/publish-knowledge/publish-knowledge.handler'
import { VerifyKnowledgeHandler } from './application/commands/verify-knowledge/verify-knowledge.handler'
import { DeleteKnowledgeHandler } from './application/commands/delete-knowledge/delete-knowledge.handler'
import { GetKnowledgeItemHandler } from './application/queries/get-knowledge-item/get-knowledge-item.handler'
import { ListKnowledgeItemsHandler } from './application/queries/list-knowledge-items/list-knowledge-items.handler'
import { ListRevisionsHandler } from './application/queries/list-revisions/list-revisions.handler'
import { PrismaKnowledgeQueryRepository } from './infrastructure/repositories/prisma-knowledge.query-repository'
import { KnowledgeController } from './presentation/controllers/knowledge.controller'

@Module({
  imports: [TenantModule],
  controllers: [KnowledgeController],
  exports: [KNOWLEDGE_QUERY_REPOSITORY],
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
    // Read repository (query side) — plain client, no transaction.
    { provide: KNOWLEDGE_QUERY_REPOSITORY, useClass: PrismaKnowledgeQueryRepository },
  ],
})
export class KnowledgeModule {}
