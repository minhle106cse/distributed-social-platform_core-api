import { ICommand } from '@distributed-social-platform/shared-kernel'

// Safety notes (kept from the removed CommandOptions block — ADR-0001 replaced the
// flag with the handler type, but the reasoning about replay/concurrency still applies):
// set-semantics: title/body are overwritten. occ: command carries expectedVersion → repo rejects
// a stale write (two concurrent editors), so the appended Revision never races.
export class UpdateKnowledgeCommand implements ICommand {
  readonly name = UpdateKnowledgeCommand.name
  // Tạo Revision trong cùng transaction với update.

  constructor(
    public readonly id: string,
    public readonly expectedVersion: number,
    public readonly title: string,
    public readonly body: string,
    public readonly editedByUserId: string,
  ) {}
}
