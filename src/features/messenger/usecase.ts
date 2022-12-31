import {
  validateGroupChatOwner,
  validateGroupChatUsersCount,
  validatePrivateChatOwner,
  validateUserInGroupParticipant,
} from "features/messenger/service";
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
import { validateRequiredFields } from "types/error";

export class MessengerUseCase {
  constructor(private repo: TMessengerRepository, private sql: Sql) {}

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

  async findUser(id: string): Promise<User> {
    validateRequiredFields({ id });

    const user = await this.repo.findUser(id as UserId);
    return user;
  }

  async findSuggestedUsers(userId: string): Promise<User[]> {
    validateRequiredFields({ userId });

    const users = await this.repo.findSuggested(userId as UserId);

    return users;
  }

  async searchUsers(name?: string): Promise<User[]> {
    const users = await this.repo.findAllUsers(name);

    return users;
  }

  // Chat.
  async findAllChats(
    userId: string
  ): Promise<{ chats: Chat[]; users: User[] }> {
    validateRequiredFields({ userId });

    const chats = await this.repo.findAllChats(userId as UserId);
    const uniqueUserIds = [...new Set(chats.flatMap((chat) => chat.userIds))];

    // TODO: Limit the users? Max 1_000 per group, pagination of limit 20, total 20_000 users max?
    const users = await this.repo.findUsersByUserIds(uniqueUserIds as UserId[]);
    const usersWithIdentity = users.map((user) => {
      return {
        ...user,
        me: user.id === userId,
      };
    });

    return {
      chats,
      users: usersWithIdentity,
    };
  }

  async findChatByUserIds(
    userId: string,
    userIds: string[]
  ): Promise<Chat | undefined> {
    const allUserIds = [...new Set(userIds.concat(userId))];

    switch (allUserIds.length) {
      case 0:
      case 1:
        return undefined;
      case 2:
        return this.repo.findPrivateChatByUserIds(
          userId as UserId,
          userIds[0] as UserId
        );
      default:
        validateGroupChatUsersCount(allUserIds);

        // findGroupChatsWithParticipants
        return this.repo.findGroupChatByUserIds(allUserIds as UserId[]);
    }
  }

  async createChat(userId: string, userIds: string[]): Promise<Chat> {
    const allUserIds = [...new Set(userIds.concat(userId))];
    switch (allUserIds.length) {
      case 0:
      case 1:
        throw new Error("not enough users to create chat");
      case 2: {
        const chat = await this.createPrivateChat(userId, userIds[0]);
        return {
          id: chat.id,
          type: "private",
          userIds: allUserIds,
        } as Chat;
      }
      default: {
        const [chat] = await this.createGroupChat(userId, userIds);
        return {
          id: chat.id,
          type: "group",
          userIds: allUserIds,
        } as Chat;
      }
    }
  }

  // PrivateChat.

  async createPrivateChat(
    userId: string,
    otherUserId: string
  ): Promise<PrivateChat> {
    validateRequiredFields({ userId, otherUserId });

    const chat = await this.repo.createPrivateChat(
      userId as UserId,
      otherUserId
    );

    return chat;
  }

  async createPrivateChatMessage(
    privateChatId: string,
    userId: string,
    body: string
  ): Promise<PrivateChatMessage> {
    validateRequiredFields({ privateChatId, userId, body });

    const message = await this.repo.createPrivateChatMessage(
      privateChatId,
      userId as UserId,
      body
    );

    return {
      ...message,
      mine: true,
    };
  }

  async findAllPrivateChats(userId: string): Promise<PrivateChat[]> {
    validateRequiredFields({ userId });

    const chats = await this.repo.findAllPrivateChats(userId as UserId);

    return chats;
  }

  async findAllPrivateChatMessages(
    userId: string,
    privateChatId: string
  ): Promise<PrivateChatMessage[]> {
    validateRequiredFields({ privateChatId });

    const chat = await this.repo.findPrivateChat(privateChatId);
    validatePrivateChatOwner(userId as UserId, chat);

    const messages = await this.repo.findAllPrivateChatMessages(privateChatId);
    const messagesWithIdentifiers = messages.map((msg) => {
      return {
        ...msg,
        mine: msg.userId === userId,
      };
    });

    return messagesWithIdentifiers;
  }

  // GroupChat.

  async createGroupChat(
    userId: string,
    userIds: string[]
  ): Promise<Readonly<[GroupChat, GroupChatParticipant[]]>> {
    validateRequiredFields({ userIds });

    userIds = [...new Set(userIds.concat(userId))];
    validateUserInGroupParticipant(userId as UserId, userIds as UserId[]);
    validateGroupChatUsersCount(userIds);

    const [chat, users] = await this.sql.begin(async (sql: Sql) => {
      const repo = this.repo.clone(sql);

      const chat = await repo.createGroupChat(userId as UserId);
      const users = await repo.createGroupChatParticipants(
        chat.id,
        userIds as UserId[]
      );

      return [chat, users] as const;
    });

    return [chat, users] as const;
  }

  async createGroupChatMessage(
    groupChatId: string,
    userId: string,
    body: string
  ): Promise<GroupChatMessage> {
    validateRequiredFields({ groupChatId, userId, body });

    const message = await this.repo.createGroupChatMessage(
      groupChatId,
      userId as UserId,
      body
    );

    return {
      ...message,
      mine: true,
    };
  }

  async findAllGroupChats(userId: string): Promise<GroupChat[]> {
    validateRequiredFields({ userId });

    const chats = await this.repo.findAllGroupChats(userId as UserId);

    return chats;
  }

  async findAllGroupChatMessages(
    userId: string,
    groupChatId: string
  ): Promise<GroupChatMessage[]> {
    validateRequiredFields({ groupChatId });

    const users = await this.repo.findGroupChatParticipants(groupChatId);
    validateGroupChatOwner(groupChatId, userId as UserId, users);

    const messages = await this.repo.findAllGroupChatMessages(groupChatId);
    const messagesWithIdentifiers = messages.map((msg) => {
      return {
        ...msg,
        mine: msg.userId === userId,
      };
    });

    return messagesWithIdentifiers;
  }
}

export function createUsecase(
  repo: TMessengerRepository,
  sql: Sql
): MessengerUseCase {
  return new MessengerUseCase(repo, sql);
}
