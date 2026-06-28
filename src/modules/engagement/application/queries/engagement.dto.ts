export interface VoteSummaryDto {
  score: number
  upvotes: number
  downvotes: number
  myVote: number
}

export interface BookmarkDto {
  itemId: string
  createdAt: Date
}

export interface FollowDto {
  targetType: string
  targetId: string
  createdAt: Date
}
