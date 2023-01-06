import type {
  Chat,
  ChatMessage,
  MessengerRepository,
  User,
  UserId,
} from "features/messenger/types";
import { validateRequiredFields } from "types/error";
import { assertIsShortText } from "types/text";

import {
  GroupChatDuplicateUsersError,
  GroupChatUsersCountError,
  PrivateChatUsersCountError,
} from "./error";
import { assertIsChatType } from "./types";

export class MessengerUseCase {
  constructor(private repo: MessengerRepository) {}

  // User.
  async register(name: string): Promise<User> {
    validateRequiredFields({ name });

    const user = await this.repo.createUser(name);
    return user;
  }

  async login(name: string): Promise<User> {
    validateRequiredFields({ name });

    const user = await this.repo.findUserByName(name);
    return user;
  }

  async findUser(id: UserId): Promise<User> {
    validateRequiredFields({ id });

    const user = await this.repo.findUser(id);
    return user;
  }

  async findSuggestedUsers(userId: UserId): Promise<User[]> {
    validateRequiredFields({ userId });

    const users = await this.repo.findSuggested(userId);

    return users;
  }

  async searchUsers(name?: string): Promise<User[]> {
    const users = await this.repo.findAllUsers(name);

    return users;
  }

  // Chat.
  async findAllChats(
    userId: UserId
  ): Promise<{ chats: Chat[]; users: User[] }> {
    validateRequiredFields({ userId });

    const chats = await this.repo.findAllChats(userId);
    const uniqueUserIds = [
      ...new Set(chats.flatMap((chat: Chat) => chat.userIds)),
    ];

    const users = await this.repo.findUsersByUserIds(uniqueUserIds as UserId[]);

    return {
      chats,
      users,
    };
  }

  async findChatByUserIds(
    type: string,
    userId: string,
    userIds: string[]
  ): Promise<Chat | undefined> {
    validateRequiredFields({ type, userId, userIds });
    assertIsChatType(type);

    const allUserIds = [...new Set(userIds.concat(userId))];
    return this.repo.findChatByUserIds(type, allUserIds as UserId[]);
  }

  async createChat(
    type: string,
    userId: UserId,
    userIds: UserId[]
  ): Promise<Chat> {
    validateRequiredFields({ type, userId, userIds });
    assertIsChatType(type);

    // Add the existing user to the list of chat members.
    userIds.push(userId);

    switch (type) {
      case "private":
        PrivateChatUsersCountError.validate(userIds.length);
        break;
      case "group":
        GroupChatUsersCountError.validate(userIds.length);
        GroupChatDuplicateUsersError.validate(userIds);
        break;
    }
    return this.repo.createChat(type, userId, userIds);
  }

  async createChatMessage(
    type: string,
    userId: UserId,
    chatId: string,
    body: string
  ): Promise<ChatMessage> {
    validateRequiredFields({ type, userId, chatId, body });
    assertIsShortText(body);
    assertIsChatType(type);

    return this.repo.createChatMessage(type, userId, chatId, body);
  }

  async findAllChatMessages(
    type: string,
    chatId: string
  ): Promise<ChatMessage[]> {
    validateRequiredFields({ type, chatId });
    assertIsChatType(type);

    return this.repo.findAllChatMessages(type, chatId);
  }
}

export function createUsecase(repo: MessengerRepository): MessengerUseCase {
  return new MessengerUseCase(repo);
}
