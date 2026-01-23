import { Type, Static } from '@sinclair/typebox'

export const CreateUserSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  name: Type.String({ minLength: 2 }),
})

export type CreateUserRequest = Static<typeof CreateUserSchema>
export type CreateUserReponse = {
  id: string
  email: string
  name: string
}
