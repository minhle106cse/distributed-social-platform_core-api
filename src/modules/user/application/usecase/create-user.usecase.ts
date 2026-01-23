import { Inject, Injectable } from '@nestjs/common'
import { USER_REPOSITORY, type UserRepository } from '../../domain/user.repository'
import { User } from '../../domain/user.entity'
import { CreateUserCommand } from '../dto/create-user.command'
import { randomUUID } from 'crypto'

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(command: CreateUserCommand) {
    const user = new User(randomUUID(), command.email, command.name)
    await this.userRepo.create(user)
    return user
  }
}
