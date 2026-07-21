import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class DeleteKnowledgeCommand implements ICommand {
  readonly name = DeleteKnowledgeCommand.name
  readonly options: CommandOptions = {
    transactional: false,
    // set-semantics: soft-delete sets deletedAt; re-applying lands on the same state.
  }

  constructor(public readonly id: string) {}
}
