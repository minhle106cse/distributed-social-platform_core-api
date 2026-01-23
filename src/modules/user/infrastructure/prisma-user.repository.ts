import { User } from 'src/modules/user/domain/user.entity'
/* import { PrismaService } from './prisma.service' */
import { UserRepository } from 'src/modules/user/domain/user.repository'

export class PrismaUserRepository implements UserRepository {
  /* constructor(private readonly prisma: PrismaService) {} */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async create(user: User) {
    /* const record = await this.prisma.user.create({
      data: UserMapper.createToPrisma(user),
    }) */

    await new Promise((resolve) => setTimeout(resolve, 100)) // Simula una operación asíncrona
  }
}
