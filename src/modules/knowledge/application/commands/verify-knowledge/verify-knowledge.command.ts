import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class VerifyKnowledgeCommand implements ICommand {
  readonly name = 'VerifyKnowledgeCommand'
  readonly options: CommandOptions = { transactional: false, retryable: false }

  constructor(
    public readonly id: string,
    public readonly verifierUserId: string,
  ) {}
}
