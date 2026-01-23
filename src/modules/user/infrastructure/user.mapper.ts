import { User } from '../domain/user.entity'

export class UserMapper {
  static createToPrisma(entity: User) {
    return {
      id: entity.id,
      email: entity.email,
      name: entity.name,
    }
  }
}
