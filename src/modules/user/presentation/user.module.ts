import { Module } from '@nestjs/common'
import { UserController } from './user.controller'
import { CreateUserUseCase } from '../application/usecases/create-user.usecase'
import { UserInfraModule } from '../infrastructure/user-infra.module'

@Module({
  imports: [UserInfraModule],
  controllers: [UserController],
  providers: [CreateUserUseCase],
})
export class UserModule {}
