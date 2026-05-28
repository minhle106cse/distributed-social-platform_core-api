import { Controller, Post, Body, HttpCode } from '@nestjs/common'
import { CreateUserUseCase } from '../application/usecases/create-user.usecase'
import { CreateUserCommand } from '../application/dto/create-user.command'
import {
  CreateUserResponse,
  CreateUserRequest,
} from './schemas/create-user.schema'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly createUser: CreateUserUseCase) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully', type: CreateUserResponse })
  async create(@Body() body: CreateUserRequest): Promise<CreateUserResponse> {
    const command = new CreateUserCommand(body.email, body.name)
    const createUserResult = await this.createUser.execute(command)

    const response: CreateUserResponse = {
      id: createUserResult.id,
      email: createUserResult.email,
      name: createUserResult.name,
    }

    return response
  }
}
