export interface KnowledgeItemDto {
  id: string
  orgId: string
  spaceId: string
  type: string
  title: string
  body: string
  parentId: string | null
  acceptedAnswerId: string | null
  status: string
  isVerified: boolean
  version: number
  createdByUserId: string
  updatedByUserId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface KnowledgeListItemDto {
  id: string
  type: string
  title: string
  status: string
  isVerified: boolean
  version: number
  updatedAt: Date
}

export interface RevisionDto {
  id: string
  version: number
  editedByUserId: string
  createdAt: Date
}
