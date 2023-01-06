import type { Brand } from "types/brand";
import type { Pagination } from "types/pagination";
import { ShortText } from "types/text";

const CHAT_TYPES = ["private", "group"];
export type ChatType = typeof CHAT_TYPES[number];

export function assertIsChatType(type: string): asserts type is ChatType {
  if (!CHAT_TYPES.includes(type)) {
    throw new TypeError(`ChatType: value "${type}" is invalid`);
  }
}

export type UserId = Brand<string, "UserId">;

export type User = {
  id: string;
  me: boolean;
  name: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Chat = {
  id: string;
  type: ChatType;
  userId: string; // The owner of the chat.
  userIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type ChatMessage = {
  id: string;
  type: ChatType;
  body: string;
  userId: string;
  chatId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TokenCreator = {
  (userId: string): Promise<string>;
};

export interface MessengerRepository {
  // User.
  createUser(name: string): Promise<User>;
  findUser(id: UserId): Promise<User>;
  findUsersByUserIds(userIds: UserId[]): Promise<User[]>;
  findUserByName(name: string): Promise<User>;
  findAllUsers(name?: string, pagination?: Pagination): Promise<User[]>;
  findSuggested(userId: UserId, pagination?: Pagination): Promise<User[]>;

  // Chat.
  // NOTE: The actor params always comes first, so user id is always the first if exists.
  // Otherwise, other primary key will take precedence over normal columns.
  // In the case of polymorphism, the "type" might take precedence.
  createChat(type: ChatType, userId: UserId, userIds: UserId[]): Promise<Chat>;
  findChat(type: ChatType, chatId: string): Promise<Chat>;
  findChatByUserIds(type: ChatType, userIds: UserId[]): Promise<Chat>;
  findAllChats(userId: UserId, pagination?: Pagination): Promise<Chat[]>;

  // Chat Message.
  createChatMessage(
    type: ChatType,
    userId: UserId,
    chatId: string,
    body: ShortText
  ): Promise<ChatMessage>;
  findAllChatMessages(
    type: ChatType,
    chatId: string,
    pagination?: Pagination
  ): Promise<ChatMessage[]>;
}
