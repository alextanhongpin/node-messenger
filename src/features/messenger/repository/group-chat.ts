import type { Chat, ChatMessage, UserId } from "features/messenger/types";
import type { Sql } from "infra/postgres";
import { validateRequiredFields } from "types/error";
import { ErrorKind } from "types/error";
import type { Pagination } from "types/pagination";
import { paginate } from "types/pagination";
import type { ShortText } from "types/text";

import type { ChatStore } from "./chat";
import { StoreError } from "./error";

type GroupChat = {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

type GroupChatMessage = {
  id: string;
  body: string;
  userId: string;
  groupChatId: string;
  createdAt: Date;
  updatedAt: Date;
};

type GroupChatParticipant = {
  id: string;
  userId: string;
  groupChatId: string;
  createdAt: Date;
  updatedAt: Date;
};

export class GroupChatStore implements ChatStore {
  constructor(private sql: Sql) {}

  clone(sql: Sql): GroupChatStore {
    return new GroupChatStore(sql);
  }

  async create(userId: UserId, userIds: UserId[]): Promise<Chat> {
    validateRequiredFields({ userId, userIds });

    const chat: GroupChat = await this.sql.begin(async (tx: Sql) => {
      const repo = this.clone(tx);
      const chat = await repo.createGroup(userId);
      await repo.createParticipants(chat.id, userIds);

      return chat;
    });

    return {
      ...chat,
      type: "group",
      userIds: userIds,
    };
  }

  async find(chatId: string): Promise<Chat> {
    validateRequiredFields({ chatId });

    const sql = this.sql;

    const [chat] = await sql<GroupChat[]>`
      select *
      from messenger.group_chats
      where id = ${chatId}
    `;

    GroupChatNotFoundError.validate({ chatId }, chat);

    const userIds = await sql<{ userId: string }[]>`
      select user_id
      from messenger.group_chat_participants
      where group_chat_id = ${chatId}
    `;

    return {
      ...chat,
      type: "group",
      userIds: userIds.map((obj: { userId: string }) => obj.userId),
    };
  }

  async findAll(userId: UserId, pagination?: Pagination): Promise<Chat[]> {
    validateRequiredFields({ userId });

    const sql = this.sql;
    const chats = await sql<Chat[]>`
      select 
      	(array_agg(gc.id))[1] as id,
      	'group' as type,
      	(array_agg(gc.user_id))[1] as user_id,
        array_agg(gcp.user_id order by gcp.user_id) as user_ids,
      	max(gc.created_at) as created_at,
      	max(gc.updated_at) as updated_at
      from messenger.group_chats gc
      join messenger.group_chat_participants gcp on (gc.id = gcp.group_chat_id)
      group by gcp.group_chat_id
      having array_agg(gcp.user_id order by gcp.user_id) @> ${sql([userId])}
      ${paginate(sql, pagination)}
    `;

    return chats;
  }

  async findByUserIds(userIds: string[]): Promise<Chat> {
    validateRequiredFields({ userIds });

    const [chat] = await this.sql<Chat[]>`
      select 
      	(array_agg(gc.id))[1] as id,
      	'group' as type,
      	(array_agg(gc.user_id))[1] as user_id,
        array_agg(gcp.user_id order by gcp.user_id) as user_ids,
      	max(gc.created_at) as created_at,
      	max(gc.updated_at) as updated_at
      from messenger.group_chats gc
      join messenger.group_chat_participants gcp on (gc.id = gcp.group_chat_id)
      group by gcp.group_chat_id
      having array_agg(gcp.user_id order by gcp.user_id) = array(
        select unnest(${userIds}::uuid[]) user_id
        order by user_id
      )::uuid[]
      limit 1
    `;
    GroupChatNotFoundError.validate({ userIds }, chat);

    return chat;
  }

  async createChatMessage(
    userId: UserId,
    groupChatId: string,
    body: ShortText
  ): Promise<ChatMessage> {
    validateRequiredFields({ groupChatId, userId, body });

    const sql = this.sql;

    const values = {
      userId,
      groupChatId,
      body,
    };

    const [message] = await sql<GroupChatMessage[]>`
      insert into messenger.group_chat_messages ${sql(values)} 
      returning *
    `;

    return toMessage(message);
  }

  async findAllChatMessages(
    groupChatId: string,
    pagination?: Pagination
  ): Promise<ChatMessage[]> {
    validateRequiredFields({ groupChatId });

    const sql = this.sql;
    const messages = await sql<GroupChatMessage[]>`
      select * 
      from messenger.group_chat_messages
      where group_chat_id = ${groupChatId}
      order by created_at desc
      ${paginate(sql, pagination)}
    `;

    return messages.map(toMessage);
  }

  async createGroup(userId: UserId): Promise<GroupChat> {
    const sql = this.sql;

    const [chat] = await sql<GroupChat[]>`
      insert into messenger.group_chats ${sql({ userId })}
      returning *
    `;

    return chat;
  }

  async createParticipants(
    groupChatId: string,
    userIds: UserId[]
  ): Promise<GroupChatParticipant[]> {
    const sql = this.sql;

    const values = userIds.map((userId: UserId) => ({ userId, groupChatId }));
    const participants = await sql<GroupChatParticipant[]>`
      insert into messenger.group_chat_participants ${sql(values)}
      returning *
    `;

    return participants;
  }
}

// Errors.
export class GroupChatNotFoundError extends StoreError<
  Record<string, unknown>
> {
  constructor(params: Record<string, unknown>, options?: ErrorOptions) {
    super(`Chat not found`, options);
    this.kind = ErrorKind.NotFound;
    this.code = "group_chat.not_found";
    this.params = params;
  }

  static validate(params: Record<string, unknown>, chat?: GroupChat) {
    if (!chat) {
      throw new GroupChatNotFoundError(params);
    }
  }
}

function toMessage(msg: GroupChatMessage): ChatMessage {
  const { id, body, userId, groupChatId, createdAt, updatedAt } = msg;
  return {
    id,
    body,
    type: "group",
    userId,
    chatId: groupChatId,
    createdAt,
    updatedAt,
  };
}

export function createGroupChatStore(sql: Sql) {
  return new GroupChatStore(sql);
}
