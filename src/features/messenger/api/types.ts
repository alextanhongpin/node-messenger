import type { User as TUser, UserId } from "features/messenger/types";

export class User {
  constructor(
    private id: string,
    private me: boolean,
    private name: string,
    private imageUrl: string
  ) {}

  static from(userId: UserId, user: TUser): User {
    return new User(user.id, user.id === userId, user.name, user.imageUrl);
  }
  static fromArray(userId: UserId, users: TUser[]): User[] {
    return users.map((user: TUser) => User.from(userId, user));
  }

  toJSON() {
    return {
      id: this.id,
      me: this.me,
      name: this.name,
      imageUrl: this.imageUrl,
    };
  }
}
