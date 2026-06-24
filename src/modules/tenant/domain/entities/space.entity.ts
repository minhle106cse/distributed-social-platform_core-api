export type SpaceVisibility = 'ORG' | 'PRIVATE'

export interface SpaceProps {
  id: string
  orgId: string
  name: string
  visibility: SpaceVisibility
  deletedAt: Date | null
}

export class Space {
  private readonly props: SpaceProps

  private constructor(props: SpaceProps) {
    this.props = { ...props }
  }

  static create(props: {
    id: string
    orgId: string
    name: string
    visibility?: SpaceVisibility
  }): Space {
    return new Space({
      id: props.id,
      orgId: props.orgId,
      name: props.name,
      visibility: props.visibility ?? 'ORG',
      deletedAt: null,
    })
  }

  static rehydrate(props: SpaceProps): Space {
    return new Space(props)
  }

  get id() {
    return this.props.id
  }
  get orgId() {
    return this.props.orgId
  }
  get name() {
    return this.props.name
  }
  get visibility() {
    return this.props.visibility
  }
  get deletedAt() {
    return this.props.deletedAt
  }
  get isDeleted() {
    return this.props.deletedAt !== null
  }

  toSnapshot(): SpaceProps {
    return { ...this.props }
  }
}
