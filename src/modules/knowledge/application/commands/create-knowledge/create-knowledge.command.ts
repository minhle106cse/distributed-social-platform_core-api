import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'
import type { KnowledgeType } from '@/modules/knowledge/domain/entities/knowledge-item.entity'

export class CreateKnowledgeCommand implements ICommand {
  readonly name = CreateKnowledgeCommand.name
  readonly options: CommandOptions = { transactional: false, retryable: false }

  constructor(
    public readonly orgId: string,
    public readonly spaceId: string,
    public readonly type: KnowledgeType,
    public readonly title: string,
    public readonly body: string,
    public readonly parentId: string | null,
    public readonly createdByUserId: string,
  ) {}
}
