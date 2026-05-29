import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { User } from 'src/modules/user/domain/user.entity'
import { UserRepository } from 'src/modules/user/domain/user.repository'
import { UserMapper } from './user.mapper'

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: User): Promise<void> {
    await this.prisma.user.create({
      data: UserMapper.createToPrisma(user),
    })
  }
}
