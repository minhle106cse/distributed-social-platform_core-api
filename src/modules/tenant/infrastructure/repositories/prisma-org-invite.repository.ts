import { Injectable } from '@nestjs/common'
import type { Prisma } from '@/generated'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { getTx } from '@distributed-social-platform/shared-kernel'
import { OrgInvite } from '../../domain/entities/org-invite.entity'
import { OrgInviteMapper } from '../mappers/org-invite.mapper'
import type { IOrgInviteRepository } from '../../domain/repositories/org-invite.repository'

@Injectable()
export class PrismaOrgInviteRepository implements IOrgInviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get client(): Prisma.TransactionClient {
    return getTx<Prisma.TransactionClient>() ?? this.prisma.client
  }

  async save(invite: OrgInvite): Promise<void> {
    const data = OrgInviteMapper.toPersistence(invite)
    await this.client.orgInvite.upsert({
      where: { id: data.id },
      create: data,
      update: { usedAt: data.usedAt, usedBy: data.usedBy },
    })
  }

  async findByToken(token: string): Promise<OrgInvite | null> {
    const row = await this.client.orgInvite.findUnique({ where: { token } })
    if (!row) return null
    return OrgInviteMapper.toDomain(row)
  }
}
