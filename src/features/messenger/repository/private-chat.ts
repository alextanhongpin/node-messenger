import type { Chat, ChatMessage, UserId } from "features/messenger/types";
import type { Sql } from "infra/postgres";
import { validateRequiredFields } from "types/error";
import { ErrorKind } from "types/error";
import type { Pagination } from "types/pagination";
import { paginate } from "types/pagination";
import type { ShortText } from "types/text";

import type { ChatStore } from "./chat";
import { StoreError } from "./error";

export type PrivateChat = {
  id: string;
  userId: string;
  user1Id: string;
  user2Id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PrivateChatMessage = {
  id: string;
  userId: string;
  body: string;
  privateChatId: string;
  createdAt: Date;
  updatedAt: Date;
};

export class PrivateChatStore implements ChatStore {
  constructor(private sql: Sql) {}

  async create(userId: UserId, userIds: string[]): Promise<Chat> {
    validateRequiredFields({ userId, userIds });

    const allUserIds = userIds.concat(userId);
    allUserIds.sort();

    const user1Id = allUserIds[0];
    const user2Id = allUserIds[1];

    const [chat] = await this.sql<PrivateChat[]>`
      insert into messenger.private_chats(user_id, user1_id, user2_id) 
      values (${userId}, ${user1Id}, ${user2Id})
      returning *
    `;

    return toChat(chat);
  }

  async find(id: string): Promise<Chat> {
    validateRequiredFields({ id });

    const sql = this.sql;

    const [chat] = await sql<PrivateChat[]>`
      select *
      from messenger.private_chats
      where id = ${id}
    `;
    PrivateChatNotFoundError.validate({ id }, chat);

    return toChat(chat);
  }

  async findAll(userId: UserId, pagination?: Pagination): Promise<Chat[]> {
    validateRequiredFields({ userId });

    const sql = this.sql;
    const chats = await sql<PrivateChat[]>`
      select *
      from messenger.private_chats
      where array[user1_id, user2_id]::uuid[] @> array[${userId}]::uuid[]
      ${paginate(sql, pagination)}
    `;

    return chats.map(toChat);
  }

  async findByUserIds(userIds: UserId[]): Promise<Chat> {
    validateRequiredFields({ userIds });

    const sql = this.sql;

    const [chat] = await sql<Chat[]>`
      select
        id as id,
        'private' as type,
        user_id,
        array[user1_id, user2_id] as user_ids,
        created_at,
        updated_at
      from messenger.private_chats
      where array(
        select unnest(array[user1_id, user2_id]) user_id order by user_id
      ) = array(
        select unnest(${sql(userIds)}) user_id order by user_id
      )::uuid[]
    `;
    PrivateChatNotFoundError.validate({ userIds }, chat);

    return chat;
  }

  async createChatMessage(
    userId: UserId,
    privateChatId: string,
    body: ShortText
  ): Promise<ChatMessage> {
    validateRequiredFields({ userId, privateChatId, body });

    const sql = this.sql;

    const values = {
      userId,
      privateChatId,
      body,
    };

    const [message] = await sql<PrivateChatMessage[]>`
      insert into messenger.private_chat_messages ${sql(values)} 
      returning *
    `;
    return toChatMessage(message);
  }

  async findAllChatMessages(
    privateChatId: string,
    pagination?: Pagination
  ): Promise<ChatMessage[]> {
    validateRequiredFields({ privateChatId });

    const sql = this.sql;

    const messages = await sql<PrivateChatMessage[]>`
      select *
      from messenger.private_chat_messages
      where private_chat_id = ${privateChatId}
      order by created_at desc
      ${paginate(sql, pagination)}
    `;

    return messages.map(toChatMessage);
  }
}

// Errors.
export class PrivateChatNotFoundError extends StoreError<
  Record<string, unknown>
> {
  constructor(params: Record<string, unknown>, options?: ErrorOptions) {
    super(`Chat not found`, options);
    this.kind = ErrorKind.NotFound;
    this.code = "private_chat.not_found";
    this.params = params;
  }

  static validate(params: Record<string, unknown>, chat?: Chat | PrivateChat) {
    if (!chat) {
      throw new PrivateChatNotFoundError(params);
    }
  }
}

// Converters.
function toChat(chat: PrivateChat): Chat {
  const { id, userId, user1Id, user2Id, createdAt, updatedAt } = chat;
  return {
    id,
    type: "private",
    userId,
    userIds: [user1Id, user2Id],
    createdAt,
    updatedAt,
  };
}

function toChatMessage(msg: PrivateChatMessage): ChatMessage {
  const { id, body, privateChatId, userId, createdAt, updatedAt } = msg;
  return {
    id,
    type: "private",
    body,
    chatId: privateChatId,
    userId,
    createdAt,
    updatedAt,
  };
}

export function createPrivateChatStore(sql: Sql) {
  return new PrivateChatStore(sql);
}
