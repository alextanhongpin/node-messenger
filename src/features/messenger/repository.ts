import { UserAlreadyExistsError } from "features/messenger/errors";
import type {
  Chat,
  GroupChat,
  GroupChatMessage,
  GroupChatParticipant,
  PrivateChat,
  PrivateChatMessage,
  TMessengerRepository,
  User,
  UserId,
} from "features/messenger/types";
import type { Sql } from "infra/postgres";
import { PostgresError } from "infra/postgres";
import { NotFoundError, validateRequiredFields } from "types/error";
import type { Pagination } from "types/pagination";
import { paginate } from "types/pagination";

class MessengerRepository {
  constructor(private sql: Sql) {}

  clone(sql: Sql): MessengerRepository {
    return new MessengerRepository(sql);
  }

  // User.
  async createUser(name: string): Promise<User> {
    try {
      const [user] = await this.sql<User[]>`
      insert into messenger.users (name)
      values (${name})
      returning *`;
      return user;
    } catch (err) {
      if (err instanceof PostgresError) {
        if ("users_name_key" === err.constraint_name) {
          throw new UserAlreadyExistsError(name, { cause: err });
        }
      }

      throw err;
    }
  }

  async findUser(id: UserId): Promise<User> {
    const [user] = await this.sql<User[]>`
      select *
      from messenger.users
      where id = ${id}
      limit 1`;
    if (!user) {
      throw new NotFoundError("User", { id });
    }

    return user;
  }

  async findUserByName(name: string): Promise<User> {
    const [user] = await this.sql<User[]>`
      select *
      from messenger.users
      where name = ${name}
      limit 1`;
    if (!user) {
      throw new NotFoundError("User", { name });
    }

    return user;
  }

  async findUsersByUserIds(userIds: UserId[]): Promise<User[]> {
    if (!userIds.length) return [] as User[];
    const users = await this.sql<User[]>`
      select *
      from messenger.users
      where id in ${this.sql(userIds)}
    `;

    return users;
  }

  async findAllUsers(name?: string, pagination?: Pagination): Promise<User[]> {
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

  // Chat (both PrivateChat and GroupChat).
  async findAllChats(userId: UserId, pagination?: Pagination): Promise<Chat[]> {
    validateRequiredFields({ userId });

    const userIds = [userId];
    const chats = await this.sql<Chat[]>`
      select
        id as id,
        'private' as type,
        array[user1_id, user2_id] as user_ids,
        created_at
      from messenger.private_chats
      where array[user1_id, user2_id]::uuid[] @> ${userIds}::uuid[]
        union
      select 
        group_chat_id as id, 
        'group' as type,
        array_agg(user_id) as user_ids,
        max(created_at) as created_at
      from messenger.group_chat_participants
      group by group_chat_id
      having array_agg(user_id) @> ${userIds}::uuid[]
      order by created_at desc
      ${paginate(this.sql, pagination)}
    `;

    return chats;
  }

  // PrivateChat.
  async findAllPrivateChats(
    userId: UserId,
    pagination?: Pagination
  ): Promise<PrivateChat[]> {
    validateRequiredFields({ userId });

    const chats = await this.sql<PrivateChat[]>`
      select * 
      from messenger.private_chats
      where array[user1_id, user2_id]::uuid[] @> array[${userId}]::uuid[]
      ${paginate(this.sql, pagination)}
    `;

    return chats;
  }

  async findPrivateChat(privateChatId: string): Promise<PrivateChat> {
    validateRequiredFields({ privateChatId });

    const [chat] = await this.sql<PrivateChat[]>`
      select * 
      from messenger.private_chats
      where id = ${privateChatId}
    `;
    if (!chat) {
      throw new NotFoundError("PrivateChat", { privateChatId });
    }

    return chat;
  }

  async findPrivateChatByUserIds(
    userId: UserId,
    otherUserId: UserId
  ): Promise<Chat> {
    validateRequiredFields({ userId, otherUserId });

    const values = [userId, otherUserId];

    const [chat] = await this.sql<Chat[]>`
      select
        id as id,
        'private' as type,
        array[user1_id, user2_id] as user_ids,
        created_at
      from messenger.private_chats
      where array(select unnest(array[user1_id, user2_id]) user_id order by user_id) = array(select unnest(${this.sql.array(
        values
      )}) user_id order by user_id)::uuid[]
    `;
    if (!chat) {
      throw new NotFoundError("Chat", { userId, otherUserId });
    }

    return chat;
  }

  async createPrivateChat(
    userId: UserId,
    otherUserId: string
  ): Promise<PrivateChat> {
    validateRequiredFields({ userId, otherUserId });
    const [chat] = await this.sql<PrivateChat[]>`
      insert into messenger.private_chats(user1_id, user2_id) 
      values (${userId}, ${otherUserId})
      returning *
    `;

    return chat;
  }

  async createPrivateChatMessage(
    privateChatId: string,
    userId: UserId,
    body: string
  ): Promise<PrivateChatMessage> {
    validateRequiredFields({ privateChatId, userId, body });

    const values = {
      privateChatId,
      userId,
      body,
    };

    const [message] = await this.sql<PrivateChatMessage[]>`
      insert into messenger.private_chat_messages ${this.sql(values)} 
      returning *
    `;
    return message;
  }

  // GroupChat.

  async createGroupChat(userId: UserId): Promise<GroupChat> {
    validateRequiredFields({ userId });

    const [chat] = await this.sql<GroupChat[]>`
      insert into messenger.group_chats ${this.sql({ userId })}
      returning *
    `;

    return chat;
  }

  async createGroupChatMessage(
    groupChatId: string,
    userId: UserId,
    body: string
  ): Promise<GroupChatMessage> {
    validateRequiredFields({ groupChatId, userId, body });

    const values = {
      groupChatId,
      userId,
      body,
    };

    const [message] = await this.sql<GroupChatMessage[]>`
      insert into messenger.group_chat_messages ${this.sql(values)} 
      returning *
    `;

    return message;
  }

  async createGroupChatParticipants(
    groupChatId: string,
    userIds: UserId[]
  ): Promise<GroupChatParticipant[]> {
    validateRequiredFields({ userIds });

    const values = userIds.map((userId: UserId) => ({ userId, groupChatId }));
    const participants = await this.sql<GroupChatParticipant[]>`
      insert into messenger.group_chat_participants ${this.sql(values)}
      returning *
    `;

    return participants;
  }

  async findAllGroupChats(
    userId: UserId,
    pagination?: Pagination
  ): Promise<GroupChat[]> {
    validateRequiredFields({ userId });
    const values = [userId];

    const chats = await this.sql<GroupChat[]>`
      select 
        group_chat_id as id, 
        array_agg(user_id order by user_id) as user_ids
      from messenger.group_chat_participants
      group by group_chat_id
      having array_agg(user_id order by user_id) @> ${this.sql.array(values)}
      ${paginate(this.sql, pagination)}
    `;

    return chats;
  }

  async findGroupChat(groupChatId: string): Promise<GroupChat> {
    validateRequiredFields({ groupChatId });

    const [chat] = await this.sql<GroupChat[]>`
      select *
      from messenger.group_chats
      where id = ${groupChatId}
    `;
    if (!chat) {
      throw new NotFoundError("GroupChat", { groupChatId });
    }

    return chat;
  }

  async findGroupChatByUserIds(userIds: string[]): Promise<Chat> {
    validateRequiredFields({ userIds });

    const [chat] = await this.sql<Chat[]>`
      select 
        group_chat_id as id, 
        'group' as type,
        array_agg(user_id) as user_ids,
        max(created_at) as created_at
      from messenger.group_chat_participants
      group by group_chat_id
      having array_agg(user_id order by user_id) = array(
        select unnest(${userIds}::uuid[]) user_id
        order by user_id
      )::uuid[]
      limit 1
    `;
    if (!chat) {
      throw new NotFoundError("Chat", { userIds });
    }

    return chat;
  }

  async findGroupChatParticipants(
    groupChatId: string
  ): Promise<GroupChatParticipant[]> {
    validateRequiredFields({ groupChatId });

    const participants = await this.sql<GroupChatParticipant[]>`
      select *
      from messenger.group_chat_participants
      where group_chat_id = ${groupChatId}
    `;

    return participants;
  }

  async findAllPrivateChatMessages(
    privateChatId: string,
    pagination?: Pagination
  ): Promise<PrivateChatMessage[]> {
    validateRequiredFields({ privateChatId });

    const messages = await this.sql<PrivateChatMessage[]>`
      select * 
      from messenger.private_chat_messages
      where private_chat_id = ${privateChatId}
      order by created_at desc
      ${paginate(this.sql, pagination)}
    `;

    return messages;
  }

  async findAllGroupChatMessages(
    groupChatId: string,
    pagination?: Pagination
  ): Promise<GroupChatMessage[]> {
    validateRequiredFields({ groupChatId });

    const messages = await this.sql<GroupChatMessage[]>`
      select * 
      from messenger.group_chat_messages
      where group_chat_id = ${groupChatId}
      order by created_at desc
      ${paginate(this.sql, pagination)}
    `;

    return messages;
  }
}

function nameIlike(sql: Sql, name?: string) {
  return name ? sql`and name ilike ${"%" + name + "%"}` : sql``;
}

export function createRepository(sql: Sql): TMessengerRepository {
  return new MessengerRepository(sql);
}
