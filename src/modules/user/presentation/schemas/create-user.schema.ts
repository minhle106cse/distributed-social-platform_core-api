import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
})

export class CreateUserRequest extends createZodDto(CreateUserSchema) {}

export class CreateUserResponse {
  id: string
  email: string
  name: string
}
