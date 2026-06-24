import { Injectable } from '@nestjs/common'
import type { Prisma } from '@/generated'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { getTx } from '@/common/database/transaction.context'
import { OrgInvite } from '../../domain/entities/org-invite.entity'
import type { IOrgInviteRepository } from '../../domain/repositories/org-invite.repository'
import type { OrgRole } from '../../domain/entities/membership.entity'

@Injectable()
export class PrismaOrgInviteRepository implements IOrgInviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get client(): Prisma.TransactionClient {
    return getTx<Prisma.TransactionClient>() ?? this.prisma
  }

  async save(invite: OrgInvite): Promise<void> {
    const snap = invite.toSnapshot()
    await this.client.orgInvite.upsert({
      where: { id: snap.id },
      create: {
        id: snap.id,
        token: snap.token,
        orgId: snap.orgId,
        role: snap.role,
        createdBy: snap.createdBy,
        expiresAt: snap.expiresAt,
        usedAt: snap.usedAt,
        usedBy: snap.usedBy,
      },
      update: {
        usedAt: snap.usedAt,
        usedBy: snap.usedBy,
      },
    })
  }

  async findByToken(token: string): Promise<OrgInvite | null> {
    const row = await this.client.orgInvite.findUnique({ where: { token } })
    if (!row) return null
    return OrgInvite.rehydrate({
      id: row.id,
      token: row.token,
      orgId: row.orgId,
      role: row.role,
      createdBy: row.createdBy,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      usedBy: row.usedBy,
    })
  }
}
