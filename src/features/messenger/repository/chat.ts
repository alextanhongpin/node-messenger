import type { Chat, ChatMessage, UserId } from "features/messenger/types";
import type { Pagination } from "types/pagination";
import type { ShortText } from "types/text";

export interface ChatStore {
  create(userId: UserId, userIds: UserId[]): Promise<Chat>;
  find(chatId: string): Promise<Chat>;
  findAll(userId: string, pagination?: Pagination): Promise<Chat[]>;
  findByUserIds(userIds: UserId[]): Promise<Chat>;
  createChatMessage(
    userId: UserId,
    chatId: string,
    body: ShortText
  ): Promise<ChatMessage>;
  findAllChatMessages(
    chatId: string,
    pagination?: Pagination
  ): Promise<ChatMessage[]>;
}
