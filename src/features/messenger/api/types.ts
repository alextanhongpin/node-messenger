import type { Chat, ChatMessage, User, UserId } from "features/messenger/types";

export interface UserResponse {
  id: string;
  me: boolean;
  isOnline?: boolean;
  name: string;
  imageUrl: string;
}

export interface ChatResponse {
  id: string;
  mine: boolean;
  type: string;
  userId: string;
  userIds: string[];
}

export interface ChatMessageResponse {
  id: string;
  mine: boolean;
  type: string;
  body: string;
  userId: string;
  chatId: string;
  createdAt: Date;
}

export class SSEResponse<T> {
  constructor(private id: string, private data: T, private event?: string) {}

  toString(): string {
    const response = [];
    if (this.event) response.push(`event: ${this.event}`);
    if (this.data) response.push(`data: ${JSON.stringify(this.data)}`);
    // NOTE: The id is appended below message data by the server, to ensure that lastEventId is updated after the message is received.
    if (this.id) response.push(`id: ${this.id}`);
    const result = response.join("\n");
    return `${result}\n\n`;
  }
}

export function toUser(
  currUserId: UserId,
  user: User,
  onlineStatusByUserId?: Record<string, boolean>
): UserResponse {
  const { id, name, imageUrl } = user;

  return {
    id,
    me: id === currUserId,
    isOnline: onlineStatusByUserId?.[id] ?? false,
    name,
    imageUrl,
  };
}

export function toUsers(
  currUserId: UserId,
  users: User[],
  onlineStatusByUserId?: Record<string, boolean>
): UserResponse[] {
  return users.map((user: User) =>
    toUser(currUserId, user, onlineStatusByUserId)
  );
}

export function toChat(currUserId: UserId, chat: Chat): ChatResponse {
  const { id, type, userId, userIds } = chat;
  return {
    id,
    type,
    mine: userId === currUserId,
    userId,
    userIds,
  };
}
export function toChats(currUserId: UserId, chats: Chat[]): ChatResponse[] {
  return chats.map((chat: Chat) => toChat(currUserId, chat));
}

export function toChatMessage(
  currUserId: UserId,
  msg: ChatMessage
): ChatMessageResponse {
  const { id, type, body, userId, chatId, createdAt } = msg;
  return {
    id,
    mine: userId === currUserId,
    type,
    body,
    userId,
    chatId,
    createdAt,
  };
}

export function toChatMessages(
  currUserId: UserId,
  msgs: ChatMessage[]
): ChatMessageResponse[] {
  return msgs.map((msg: ChatMessage) => toChatMessage(currUserId, msg));
}
