import { Space } from '../entities/space.entity'

export interface ISpaceRepository {
  findById(id: string): Promise<Space | null>
  save(space: Space): Promise<void>
}

export const SPACE_REPOSITORY = Symbol('ISpaceRepository')
