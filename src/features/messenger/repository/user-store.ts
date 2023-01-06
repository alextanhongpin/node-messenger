import type { User, UserId } from "features/messenger/types";
import type { Sql } from "infra/postgres";
import { PostgresError } from "infra/postgres";
import { validateRequiredFields } from "types/error";
import { AppError, ErrorKind } from "types/error";
import type { Pagination } from "types/pagination";
import { paginate } from "types/pagination";

import { StoreError } from "./error";

export class UserStore {
  constructor(private sql: Sql) {}

  async create(name: string): Promise<User> {
    try {
      const [user] = await this.sql<User[]>`
      insert into messenger.users (name)
      values (${name})
      returning *`;

      return user;
    } catch (err) {
      UserAlreadyExistsError.validate(name, err);
      throw err;
    }
  }

  async find(id: UserId): Promise<User> {
    const [user] = await this.sql<User[]>`
      select *
      from messenger.users
      where id = ${id}
      limit 1`;
    UserNotFoundError.validate({ id }, user);

    return user;
  }

  async findByName(name: string): Promise<User> {
    const [user] = await this.sql<User[]>`
      select *
      from messenger.users
      where name = ${name}
      limit 1`;
    UserNotFoundError.validate({ name }, user);

    return user;
  }

  async findAllByUserIds(userIds: UserId[]): Promise<User[]> {
    if (!userIds.length) return [] as User[];
    const users = await this.sql<User[]>`
      select *
      from messenger.users
      where id in ${this.sql(userIds)}
    `;

    return users;
  }

  async findAll(name?: string, pagination?: Pagination): Promise<User[]> {
    const users = await this.sql<User[]>`
      select * 
      from messenger.users
      where true
      ${nameIlike(this.sql, name)}
      ${paginate(this.sql, pagination)}
    `;

    return users;
  }

  async findSuggested(
    userId: UserId,
    pagination?: Pagination
  ): Promise<User[]> {
    validateRequiredFields({ userId });

    const users = await this.sql<User[]>`
      select * 
      from messenger.users
      where id <> ${userId}
      order by random()
      ${paginate(this.sql, pagination)}
    `;

    return users;
  }
}

// Errors.
export class UserAlreadyExistsError extends StoreError<{ name: string }> {
  constructor(name: string, options?: ErrorOptions) {
    super(
      `A user with the name already exists. Choose a different name`,
      options
    );
    this.code = "users.already_exists";
    this.kind = ErrorKind.AlreadyExists;
    this.params = { name };
  }

  static validate(name: string, err: unknown) {
    if (err instanceof PostgresError) {
      if ("users_name_key" === err.constraint_name) {
        throw new UserAlreadyExistsError(name, { cause: err });
      }
    }
  }
}

export class UserNotFoundError extends StoreError<Record<string, unknown>> {
  constructor(params: Record<string, unknown>, options?: ErrorOptions) {
    super(`User not found`, options);
    this.kind = ErrorKind.NotFound;
    this.code = "user.not_found";
    this.params = params;
  }

  static validate(params: Record<string, unknown>, user?: User) {
    if (!user) {
      throw new UserNotFoundError(params);
    }
  }
}

function nameIlike(sql: Sql, name?: string) {
  return name ? sql`and name ilike ${"%" + name + "%"}` : sql``;
}

export function createUserStore(sql: Sql): UserStore {
  return new UserStore(sql);
}
