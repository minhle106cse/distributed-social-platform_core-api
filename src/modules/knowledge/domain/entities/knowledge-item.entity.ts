import { v7 } from 'uuid'

export type KnowledgeType = 'DOCUMENT' | 'QUESTION' | 'ANSWER' | 'RUNBOOK' | 'ADR'
export type KnowledgeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'STALE'

export interface KnowledgeItemProps {
  id: string
  orgId: string
  spaceId: string
  type: KnowledgeType
  title: string
  body: string
  parentId: string | null
  acceptedAnswerId: string | null
  status: KnowledgeStatus
  isVerified: boolean
  version: number
  createdByUserId: string
  updatedByUserId: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class KnowledgeItem {
  private _id: string
  private _orgId: string
  private _spaceId: string
  private _type: KnowledgeType
  private _title: string
  private _body: string
  private _parentId: string | null
  private _acceptedAnswerId: string | null
  private _status: KnowledgeStatus
  private _isVerified: boolean
  private _version: number
  private _createdByUserId: string
  private _updatedByUserId: string | null
  private _createdAt: Date
  private _updatedAt: Date
  private _deletedAt: Date | null

  private constructor(props: KnowledgeItemProps) {
    this._id = props.id
    this._orgId = props.orgId
    this._spaceId = props.spaceId
    this._type = props.type
    this._title = props.title
    this._body = props.body
    this._parentId = props.parentId
    this._acceptedAnswerId = props.acceptedAnswerId
    this._status = props.status
    this._isVerified = props.isVerified
    this._version = props.version
    this._createdByUserId = props.createdByUserId
    this._updatedByUserId = props.updatedByUserId
    this._createdAt = new Date(props.createdAt.getTime())
    this._updatedAt = new Date(props.updatedAt.getTime())
    this._deletedAt = props.deletedAt ? new Date(props.deletedAt.getTime()) : null
  }

  // Tạo mới: luôn DRAFT, version=1. Entity sinh id (v7) — KHÔNG nhận id từ caller.
  static create(props: {
    orgId: string
    spaceId: string
    type: KnowledgeType
    title: string
    body: string
    parentId?: string | null
    createdByUserId: string
  }): KnowledgeItem {
    const now = new Date()
    return new KnowledgeItem({
      id: v7(),
      orgId: props.orgId,
      spaceId: props.spaceId,
      type: props.type,
      title: props.title,
      body: props.body,
      parentId: props.parentId ?? null,
      acceptedAnswerId: null,
      status: 'DRAFT',
      isVerified: false,
      version: 1,
      createdByUserId: props.createdByUserId,
      updatedByUserId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
  }

  static rehydrate(props: KnowledgeItemProps): KnowledgeItem {
    return new KnowledgeItem(props)
  }

  // OCC: mỗi edit bump version. Handler ghi expectedVersion trước khi gọi.
  applyEdit(props: { title: string; body: string; editedByUserId: string }): void {
    this._title = props.title
    this._body = props.body
    this._updatedByUserId = props.editedByUserId
    this._updatedAt = new Date()
    this._version += 1
  }

  publish(): void {
    this._status = 'PUBLISHED'
  }

  /**
   * Idempotent transition — same shape (and same reason) as
   * `Notification.markAsRead()`: a repeat verify (retry, double-click, a second
   * moderator opening a stale page) must not silently re-stamp
   * `updatedByUserId`/`updatedAt` with the later actor. The attribution belongs
   * to whoever actually flipped the flag, and only that call did.
   *
   * Returns whether this call changed state, so the handler can skip the write
   * entirely when it didn't. There is no un-verify, so the transition is
   * one-way and the guard can never wrongly block a legitimate re-verify.
   */
  verify(verifierUserId: string): boolean {
    if (this._isVerified) return false
    this._isVerified = true
    this._updatedByUserId = verifierUserId
    this._updatedAt = new Date()
    return true
  }

  softDelete(): void {
    this._deletedAt = new Date()
  }

  acceptAnswer(answerId: string): void {
    this._acceptedAnswerId = answerId
    this._updatedAt = new Date()
  }

  clearAcceptedAnswer(): void {
    this._acceptedAnswerId = null
    this._updatedAt = new Date()
  }

  get id(): string {
    return this._id
  }
  get orgId(): string {
    return this._orgId
  }
  get spaceId(): string {
    return this._spaceId
  }
  get type(): KnowledgeType {
    return this._type
  }
  get title(): string {
    return this._title
  }
  get body(): string {
    return this._body
  }
  get parentId(): string | null {
    return this._parentId
  }
  get acceptedAnswerId(): string | null {
    return this._acceptedAnswerId
  }
  get status(): KnowledgeStatus {
    return this._status
  }
  get isVerified(): boolean {
    return this._isVerified
  }
  get version(): number {
    return this._version
  }
  get createdByUserId(): string {
    return this._createdByUserId
  }
  get updatedByUserId(): string | null {
    return this._updatedByUserId
  }
  get createdAt(): Date {
    return new Date(this._createdAt.getTime())
  }
  get updatedAt(): Date {
    return new Date(this._updatedAt.getTime())
  }
  get deletedAt(): Date | null {
    return this._deletedAt ? new Date(this._deletedAt.getTime()) : null
  }
  get isDeleted(): boolean {
    return this._deletedAt !== null
  }
}
