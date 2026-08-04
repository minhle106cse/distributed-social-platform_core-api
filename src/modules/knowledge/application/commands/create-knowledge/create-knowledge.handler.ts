import { Injectable } from '@nestjs/common'
import type { ITransactionalCommandHandler } from '@distributed-social-platform/shared-kernel'
import type { CoreApiRepos } from '@/infrastructure/database/prisma/core-api-repos.factory'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import { KnowledgeItem } from '@/modules/knowledge/domain/entities/knowledge-item.entity'
import { CreateKnowledgeCommand } from './create-knowledge.command'

@Injectable()
@CommandHandler(CreateKnowledgeCommand)
export class CreateKnowledgeHandler implements ITransactionalCommandHandler<
  CreateKnowledgeCommand,
  string,
  CoreApiRepos
> {
  readonly kind = 'transactional' as const

  async execute(command: CreateKnowledgeCommand, tx: CoreApiRepos): Promise<string> {
    const item = KnowledgeItem.create({
      orgId: command.orgId,
      spaceId: command.spaceId,
      type: command.type,
      title: command.title,
      body: command.body,
      parentId: command.parentId,
      createdByUserId: command.createdByUserId,
    })

    await tx.items.save(item)

    return item.id
  }
}
