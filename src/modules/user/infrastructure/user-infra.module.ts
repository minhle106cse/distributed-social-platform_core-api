import { PrismaModule } from '../../../infrastructure/prisma/prisma.module'
import { Module } from '@nestjs/common'
import { PrismaUserRepository } from './prisma-user.repository'
import { USER_REPOSITORY } from '../domain/user.repository'

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [USER_REPOSITORY],
})
export class UserInfraModule {}
