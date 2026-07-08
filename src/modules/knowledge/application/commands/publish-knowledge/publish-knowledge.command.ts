import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class PublishKnowledgeCommand implements ICommand {
  readonly name = PublishKnowledgeCommand.name
  readonly options: CommandOptions = { transactional: true, retryable: false }

  constructor(
    public readonly id: string,
    public readonly userId: string,
  ) {}
}
