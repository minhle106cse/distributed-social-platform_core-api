import { Controller, Post, Body, HttpCode } from '@nestjs/common'
import { CreateUserUseCase } from '../application/usecase/create-user.usecase'
import { CreateUserCommand } from '../application/dto/create-user.command'
import {
  CreateUserReponse,
  CreateUserSchema,
  type CreateUserRequest,
} from './schemas/create-user.schema'
import { RouteConfig } from '@nestjs/platform-fastify'

@Controller('users')
export class UserController {
  constructor(private readonly createUser: CreateUserUseCase) {}

  @Post()
  @HttpCode(201)
  @RouteConfig({
    schema: {
      body: CreateUserSchema,
    },
  })
  async create(@Body() body: CreateUserRequest): Promise<CreateUserReponse> {
    const command = new CreateUserCommand(body.email, body.name)
    const createUserResult = await this.createUser.execute(command)

    const response: CreateUserReponse = {
      id: createUserResult.id,
      email: createUserResult.email,
      name: createUserResult.name,
    }

    return response
  }
}
