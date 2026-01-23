import { User } from './user.entity'

export const USER_REPOSITORY = Symbol('USER_REPOSITORY')

export interface UserRepository {
  create(user: User): Promise<void>
}
