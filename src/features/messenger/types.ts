import type { Sql } from "infra/postgres";
import type { Brand } from "types/brand";
import type { Pagination } from "types/pagination";

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
  type: "private" | "group";
  userIds: string[];
};

export type PrivateChat = {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: Date;
  updatedat: Date;
};

export type PrivateChatMessage = {
  id: string;
  userId: string;
  mine: boolean;
  body: string;
  privateChatId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type GroupChat = {
  id: string;
  userId: string;
};

export type GroupChatMessage = {
  id: string;
  userId: string;
  mine: boolean;
  body: string;
  groupChatId: string;
  createdAt: Date;
  updatedat: Date;
};

export type GroupChatParticipant = {
  id: string;
  userId: string;
  groupChatId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TokenCreator = {
  (userId: string): Promise<string>;
};

export interface TMessengerRepository {
  clone(sql: Sql): TMessengerRepository;
  // User.
  createUser(name: string): Promise<User>;
  findUser(id: UserId): Promise<User>;
  findUsersByUserIds(userIds: UserId[]): Promise<User[]>;
  findUserByName(name: string): Promise<User>;
  findAllUsers(name?: string, pagination?: Pagination): Promise<User[]>;
  findSuggested(userId: UserId, pagination?: Pagination): Promise<User[]>;

  // Chat.
  findAllChats(userId: UserId, pagination?: Pagination): Promise<Chat[]>;

  // PrivateChat.
  createPrivateChat(userId: UserId, otherUserId: string): Promise<PrivateChat>;
  createPrivateChatMessage(
    privateChatId: string,
    userId: UserId,
    body: string
  ): Promise<PrivateChatMessage>;
  findPrivateChat(privateChatId: string): Promise<PrivateChat>;
  findAllPrivateChats(
    userId: UserId,
    pagination?: Pagination
  ): Promise<PrivateChat[]>;
  findPrivateChatByUserIds(userId: UserId, otherUserId: UserId): Promise<Chat>;

  // PrivateChatMessage.
  findAllPrivateChatMessages(
    privateChatId: string,
    pagination?: Pagination
  ): Promise<PrivateChatMessage[]>;

  // GroupChat.
  createGroupChat(userId: UserId): Promise<GroupChat>;
  createGroupChatMessage(
    groupChatId: string,
    userId: UserId,
    body: string
  ): Promise<GroupChatMessage>;
  findGroupChat(groupChatId: string): Promise<GroupChat>;
  findAllGroupChats(
    userId: UserId,
    pagination?: Pagination
  ): Promise<GroupChat[]>;
  findGroupChatByUserIds(userIds: string[]): Promise<Chat>;

  // GroupChatMessage.
  findAllGroupChatMessages(
    groupChatId: string,
    pagination?: Pagination
  ): Promise<GroupChatMessage[]>;

  // GroupChatParticipant.
  createGroupChatParticipants(
    groupChatId: string,
    userIds: UserId[]
  ): Promise<GroupChatParticipant[]>;
  findGroupChatParticipants(
    groupChatId: string
  ): Promise<GroupChatParticipant[]>;
}
