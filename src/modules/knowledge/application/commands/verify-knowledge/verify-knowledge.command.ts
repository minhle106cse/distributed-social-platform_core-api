import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class VerifyKnowledgeCommand implements ICommand {
  readonly name = VerifyKnowledgeCommand.name
  readonly options: CommandOptions = {
    transactional: false,
    // set-semantics: marks the item verified; re-applying lands on the same state.
  }

  constructor(
    public readonly id: string,
    public readonly verifierUserId: string,
  ) {}
}
