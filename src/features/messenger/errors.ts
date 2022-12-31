import { AppError, ErrorKind } from "types/error";

export class UserAlreadyExistsError extends AppError<{ name: string }> {
  constructor(name: string, options?: ErrorOptions) {
    super(
      `A user with the name already exists. Choose a different name`,
      options
    );
    this.code = "users.already_exists";
    this.kind = ErrorKind.AlreadyExists;
    this.params = { name };
  }
}

export class GroupChatUsersCountError extends AppError<{ count: number }> {
  static min = 3;
  static max = 1_000;

  constructor(count: number, options?: ErrorOptions) {
    super(
      `A group chat can only have ${GroupChatUsersCountError.min} to ${GroupChatUsersCountError.max} users`,
      options
    );
    this.code = "group_chats.users_count_out_of_range";
    this.kind = ErrorKind.BadInput;
    this.params = { count };
  }
}

export class GroupChatDuplicateUsers extends AppError<{
  duplicateUserIds: string[];
}> {
  constructor(duplicateUserIds: string[], options?: ErrorOptions) {
    super(`The same users appears twice in the group chat`, options);
    this.code = "group_chats.duplicate_users";
    this.kind = ErrorKind.Conflict;
    this.params = { duplicateUserIds };
  }
}
