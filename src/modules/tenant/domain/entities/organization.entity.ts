export interface OrganizationProps {
  id: string
  name: string
  slug: string
  seatLimit: number
  aiRateLimitPerMin: number
  createdAt: Date
  deletedAt: Date | null
}

export class Organization {
  private readonly props: OrganizationProps

  private constructor(props: OrganizationProps) {
    this.props = { ...props }
  }

  static create(props: {
    id: string
    name: string
    slug: string
    seatLimit?: number
    aiRateLimitPerMin?: number
  }): Organization {
    return new Organization({
      id: props.id,
      name: props.name,
      slug: props.slug,
      seatLimit: props.seatLimit ?? 10,
      aiRateLimitPerMin: props.aiRateLimitPerMin ?? 20,
      createdAt: new Date(),
      deletedAt: null,
    })
  }

  static rehydrate(props: OrganizationProps): Organization {
    return new Organization(props)
  }

  get id() { return this.props.id }
  get name() { return this.props.name }
  get slug() { return this.props.slug }
  get seatLimit() { return this.props.seatLimit }
  get aiRateLimitPerMin() { return this.props.aiRateLimitPerMin }
  get createdAt() { return this.props.createdAt }
  get deletedAt() { return this.props.deletedAt }
  get isDeleted() { return this.props.deletedAt !== null }

  toSnapshot(): OrganizationProps {
    return { ...this.props }
  }
}
