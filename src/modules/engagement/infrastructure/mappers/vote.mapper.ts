import { Vote } from '../../domain/entities/vote.entity'

type PrismaVote = {
  id: string
  orgId: string
  itemId: string
  userId: string
  value: number
  createdAt: Date
}

export class VoteMapper {
  static toDomain(row: PrismaVote): Vote {
    return Vote.rehydrate({
      id: row.id,
      orgId: row.orgId,
      itemId: row.itemId,
      userId: row.userId,
      value: row.value,
      createdAt: row.createdAt,
    })
  }

  static toPersistence(vote: Vote) {
    return {
      id: vote.id,
      orgId: vote.orgId,
      itemId: vote.itemId,
      userId: vote.userId,
      value: vote.value,
      createdAt: vote.createdAt,
    }
  }
}
