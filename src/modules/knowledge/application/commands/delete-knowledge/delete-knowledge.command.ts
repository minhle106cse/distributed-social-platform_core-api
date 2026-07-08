import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class DeleteKnowledgeCommand implements ICommand {
  readonly name = DeleteKnowledgeCommand.name
  readonly options: CommandOptions = { transactional: false, retryable: false }

  constructor(public readonly id: string) {}
}
