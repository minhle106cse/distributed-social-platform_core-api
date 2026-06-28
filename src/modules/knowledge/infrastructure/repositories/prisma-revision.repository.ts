import { Injectable } from '@nestjs/common'
import type { Prisma } from '@/generated'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { getTx } from '@distributed-social-platform/shared-kernel'
import type { Revision } from '../../domain/entities/revision.entity'
import type { IRevisionRepository } from '../../domain/repositories/revision.repository'
import { RevisionMapper } from '../mappers/revision.mapper'

@Injectable()
export class PrismaRevisionRepository implements IRevisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get client(): Prisma.TransactionClient {
    return getTx<Prisma.TransactionClient>() ?? this.prisma.client
  }

  async save(revision: Revision): Promise<void> {
    await this.client.revision.create({ data: RevisionMapper.toPersistence(revision) })
  }
}
