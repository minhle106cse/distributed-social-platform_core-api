import type { Vote } from '../entities/vote.entity'

export interface IVoteRepository {
  findByItemAndUser(itemId: string, userId: string): Promise<Vote | null>
  upsert(vote: Vote): Promise<void>
  removeByItemAndUser(itemId: string, userId: string): Promise<void>
}

export const VOTE_REPOSITORY = Symbol('IVoteRepository')
