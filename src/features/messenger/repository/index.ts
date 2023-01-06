import type {
  Chat,
  ChatMessage,
  ChatType,
  MessengerRepository,
  User,
  UserId,
} from "features/messenger/types";
import type { Sql } from "infra/postgres";
import { validateRequiredFields } from "types/error";
import type { Pagination } from "types/pagination";
import { paginate } from "types/pagination";
import type { ShortText } from "types/text";

import { createGroupChatStore, GroupChatStore } from "./group-chat-store";
import { createPrivateChatStore, PrivateChatStore } from "./private-chat-store";
import type { ChatStore } from "./types";
import { createUserStore, UserStore } from "./user-store";

class PostgresMessengerRepository implements MessengerRepository {
  privateChatStore: PrivateChatStore;
  groupChatStore: GroupChatStore;
  userStore: UserStore;
  sql: Sql;

  constructor(sql: Sql) {
    this.sql = sql;
    this.privateChatStore = createPrivateChatStore(sql);
    this.groupChatStore = createGroupChatStore(sql);
    this.userStore = createUserStore(sql);
  }

  // User.
  async createUser(name: string): Promise<User> {
    return this.userStore.create(name);
  }

  async findUser(id: UserId): Promise<User> {
    return this.userStore.find(id);
  }

  async findUserByName(name: string): Promise<User> {
    return this.userStore.findByName(name);
  }

  async findUsersByUserIds(userIds: UserId[]): Promise<User[]> {
    return this.userStore.findAllByUserIds(userIds);
  }

  async findAllUsers(name?: string, pagination?: Pagination): Promise<User[]> {
    return this.userStore.findAll(name, pagination);
  }

  async findSuggested(
    userId: UserId,
    pagination?: Pagination
  ): Promise<User[]> {
    return this.userStore.findSuggested(userId, pagination);
  }

  // Chat (both PrivateChat and GroupChat).
  async findAllChats(userId: UserId, pagination?: Pagination): Promise<Chat[]> {
    validateRequiredFields({ userId });

    const sql = this.sql;
    const userIds = [userId];
    const chats = await sql<Chat[]>`
      select
        id as id,
        'private' as type,
        user_id,
        array[user1_id, user2_id] as user_ids,
        created_at,
        updated_at
      from messenger.private_chats
      where array[user1_id, user2_id]::uuid[] @> ${userIds}::uuid[]
        union
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
      having array_agg(gcp.user_id) @> ${userIds}::uuid[]
      order by created_at desc
      ${paginate(sql, pagination)}
    `;

    return chats;
  }

  async findChat(type: ChatType, chatId: string): Promise<Chat> {
    return this.#getChatRepo(type).find(chatId);
  }

  async findChatByUserIds(type: ChatType, userIds: UserId[]): Promise<Chat> {
    return this.#getChatRepo(type).findByUserIds(userIds);
  }

  async createChat(
    type: ChatType,
    userId: UserId,
    userIds: UserId[]
  ): Promise<Chat> {
    return this.#getChatRepo(type).create(userId, userIds);
  }

  async createChatMessage(
    type: ChatType,
    userId: UserId,
    chatId: string,
    body: ShortText
  ): Promise<ChatMessage> {
    return this.#getChatRepo(type).createChatMessage(userId, chatId, body);
  }

  async findAllChatMessages(
    type: ChatType,
    chatId: string,
    pagination?: Pagination
  ): Promise<ChatMessage[]> {
    return this.#getChatRepo(type).findAllChatMessages(chatId, pagination);
  }

  #getChatRepo(type: ChatType): ChatStore {
    switch (type) {
      case "private":
        return this.privateChatStore;
      case "group":
        return this.groupChatStore;
      default:
        throw new Error("invalid group chat type");
    }
  }
}

export function createRepository(sql: Sql): MessengerRepository {
  return new PostgresMessengerRepository(sql);
}
