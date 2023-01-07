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
    userId: string,
    userIds: string[]
  ): Promise<Chat | undefined> {
    validateRequiredFields({ userId, userIds });

    const allUserIds = [...new Set(userIds.concat(userId))];
    const type = allUserIds.length === 2 ? "private" : "group";
    assertIsChatType(type);
    return this.repo.findChatByUserIds(type, allUserIds as UserId[]);
  }

  async createChat(userId: UserId, userIds: UserId[]): Promise<Chat> {
    validateRequiredFields({ userId, userIds });

    const allUserIds = [...new Set(userIds.concat(userId))];
    const type = allUserIds.length === 2 ? "private" : "group";
    assertIsChatType(type);

    switch (type) {
      case "private":
        PrivateChatUsersCountError.validate(allUserIds.length);
        break;
      case "group":
        GroupChatUsersCountError.validate(allUserIds.length);
        GroupChatDuplicateUsersError.validate(allUserIds);
        break;
    }
    return this.repo.createChat(type, userId, allUserIds);
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
    // TODO: Check for permission?
    //findChat()

    return this.repo.findAllChatMessages(type, chatId);
  }
}

export function createUsecase(repo: MessengerRepository): MessengerUseCase {
  return new MessengerUseCase(repo);
}
