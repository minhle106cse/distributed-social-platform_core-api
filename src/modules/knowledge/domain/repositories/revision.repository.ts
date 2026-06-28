import type { Revision } from '../entities/revision.entity'

export interface IRevisionRepository {
  save(revision: Revision): Promise<void>
}

export const REVISION_REPOSITORY = Symbol('IRevisionRepository')
