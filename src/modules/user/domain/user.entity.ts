export class User {
  constructor(
    private readonly _id: string,
    private readonly _email: string,
    private readonly _name: string,
  ) {}

  get id() {
    return this._id
  }

  get email() {
    return this._email
  }

  get name() {
    return this._name
  }
}
