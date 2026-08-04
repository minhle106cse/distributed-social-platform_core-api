import type { Prisma } from '@/generated'
import type { Revision } from '../../domain/entities/revision.entity'
import type { IRevisionRepository } from '../../domain/repositories/revision.repository'
import { RevisionMapper } from '../mappers/revision.mapper'

export class PrismaRevisionRepository implements IRevisionRepository {
  constructor(private readonly client: Prisma.TransactionClient) {}

  async save(revision: Revision): Promise<void> {
    await this.client.revision.create({ data: RevisionMapper.toPersistence(revision) })
  }
}
