import { AppError, ErrorKind } from "types/error";

import type { UserId } from "./types";

export class DomainError<T> extends AppError<T> {}

export class PrivateChatUsersCountError extends DomainError<{ count: number }> {
  static min = 2;
  static max = 2;

  constructor(count: number, options?: ErrorOptions) {
    super(
      `A private chat only have max ${PrivateChatUsersCountError.min} users`,
      options
    );
    this.code = "private_chat.users_count_out_of_range";
    this.kind = ErrorKind.BadInput;
    this.params = { count };
  }

  static validate(usersCount: number) {
    const n = usersCount;
    if (
      n < PrivateChatUsersCountError.min ||
      n > PrivateChatUsersCountError.max
    ) {
      throw new PrivateChatUsersCountError(n);
    }
  }
}

export class GroupChatUsersCountError extends DomainError<{ count: number }> {
  static min = 3;
  static max = 1_000;

  constructor(count: number, options?: ErrorOptions) {
    super(
      `A group chat can only have ${GroupChatUsersCountError.min} to ${GroupChatUsersCountError.max} users`,
      options
    );
    this.code = "group_chat.users_count_out_of_range";
    this.kind = ErrorKind.BadInput;
    this.params = { count };
  }

  static validate(usersCount: number) {
    const n = usersCount;
    if (n < GroupChatUsersCountError.min || n > GroupChatUsersCountError.max) {
      throw new GroupChatUsersCountError(n);
    }
  }
}

export class GroupChatDuplicateUsersError extends DomainError<{
  userIds: string[];
}> {
  constructor(userIds: string[], options?: ErrorOptions) {
    super(`The same users appears twice in the group chat`, options);
    this.code = "group_chat.duplicate_users";
    this.kind = ErrorKind.Conflict;
    this.params = { userIds };
  }

  static validate(userIds: UserId[]) {
    const set = new Set(userIds);
    if (set.size < userIds.length) {
      throw new GroupChatDuplicateUsersError(userIds);
    }
  }
}
