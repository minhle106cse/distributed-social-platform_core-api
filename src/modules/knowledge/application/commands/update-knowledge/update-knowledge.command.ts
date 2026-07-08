import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class UpdateKnowledgeCommand implements ICommand {
  readonly name = UpdateKnowledgeCommand.name
  // Tạo Revision trong cùng transaction với update.
  readonly options: CommandOptions = { transactional: true, retryable: false }

  constructor(
    public readonly id: string,
    public readonly expectedVersion: number,
    public readonly title: string,
    public readonly body: string,
    public readonly editedByUserId: string,
  ) {}
}
