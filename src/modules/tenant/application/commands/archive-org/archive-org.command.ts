import { ICommand } from '@distributed-social-platform/shared-kernel'

// Set-semantics: soft-delete sets deletedAt; re-applying lands on the same state.
//
// Currently dispatched only from ProvisionOrgHandler's saga compensation (review of
// ADR-0001, 2026-07-30): if org creation commits but a LATER saga step fails, the
// saga was leaving the org behind with an OWNER membership pointing at a user it
// just cancelled — an org nobody could administer. This closes that loop. There is
// deliberately no public "delete my org" endpoint yet; add one if that becomes a
// real product requirement rather than widening this command's purpose to fit it.
export class ArchiveOrgCommand implements ICommand {
  readonly name = ArchiveOrgCommand.name

  constructor(public readonly orgId: string) {}
}
