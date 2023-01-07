import EventEmitter from "events";
import { NextFunction, Request, Response } from "express";
import type {
  ChatMessage,
  TokenCreator,
  TokenVerifier,
  UserId,
} from "features/messenger/types";
import { MessengerUseCase } from "features/messenger/usecase";
import { v4 as uuidv4 } from "uuid";

import {
  ChatMessageResponse,
  toChat,
  toChatMessage,
  toChatMessages,
  toChats,
  toUser,
  toUsers,
} from "./types";

class SSEResponse<T> {
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

function getChatMessageEventsHandler(
  useCase: MessengerUseCase,
  eventEmitter: EventEmitter,
  verifyToken: TokenVerifier
) {
  const headers = {
    "Content-Type": "text/event-stream;charset=UTF-8",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
  };

  // One chat id can be subscribed by multiple users.
  const userIdsByChatId: Record<string, Set<string>> = {};

  // One client id can only have on Response.
  const resByClientId: Record<string, Response> = {};

  // One user id can have multiple client ids (opening multiple tabs).
  const clientIdsByUserId: Record<string, Set<string>> = {};

  function broadcast<T>(data: T) {
    for (const res of Object.values(resByClientId)) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }

  function emit<T>(userId: string, sse: SSEResponse<T>) {
    if (!(userId in clientIdsByUserId)) {
      return;
    }
    const clientIds = [...clientIdsByUserId[userId]];
    for (const clientId of clientIds) {
      if (!(clientId in resByClientId)) {
        continue;
      }
      const res = resByClientId[clientId];
      res.write(sse.toString());
    }
  }

  function register(userId: string, chatId: string, res: Response): string {
    const clientId = uuidv4();

    // Register clients.
    if (!(userId in clientIdsByUserId)) {
      clientIdsByUserId[userId] = new Set();
    }
    clientIdsByUserId[userId].add(clientId);

    // Set Responose.
    resByClientId[clientId] = res;

    // Register chats.
    if (!(chatId in userIdsByChatId)) {
      userIdsByChatId[chatId] = new Set();
    }
    userIdsByChatId[chatId].add(userId);

    return clientId;
  }

  function deregister(userId: string, chatId: string, clientId: string) {
    // Delete response.
    delete resByClientId[clientId];

    // Delete client.
    clientIdsByUserId[userId].delete(clientId);
    if (!clientIdsByUserId[userId].size) {
      delete clientIdsByUserId[userId];
    }
    // Delete users
    userIdsByChatId[chatId].delete(userId);
    if (!userIdsByChatId[chatId].size) {
      delete userIdsByChatId[chatId];
    }
  }

  eventEmitter.on("message", (currUserId: UserId, msg: ChatMessage) => {
    if (!(msg.chatId in userIdsByChatId)) {
      return;
    }
    const userIds = [...userIdsByChatId[msg.chatId]];
    for (const userId of userIds) {
      emit(
        userId,
        new SSEResponse<ChatMessageResponse>(
          msg.id,
          toChatMessage(userId as UserId, msg)
        )
      );
    }
  });

  //setInterval(() => {
  //broadcast({ time: Date.now() });
  //}, 10_000);

  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      // Unknown usage.
      //const lastEventId = req.headers["last-event-id"];
      const token = req.query.token as string;
      const type = req.query.type as string;
      const chatId = req.params.chatId;
      const { userId } = await verifyToken(token);
      const messages = await useCase.findAllChatMessages(type, chatId);

      res.writeHead(200, headers);

      // If valid, populate the first set of messages to the
      // user based on the chat id.
      // getChatMessages(type, chatId, userId)
      const initial = new SSEResponse(
        chatId,
        toChatMessages(userId as UserId, messages),
        "history"
      );
      res.write(initial.toString());

      const clientId = register(userId, chatId, res);
      //const data = `data: ${JSON.stringify({ name: "john" })}\n\n`;

      req.on("close", () => {
        deregister(userId, chatId, clientId);
      });
    } catch (error) {
      next(error);
    }
  };
}

function postRegisterUserHandler(
  useCase: MessengerUseCase,
  createToken: TokenCreator
) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const user = await useCase.register(req.body.name);
      const token = await createToken(user.id);
      res.status(201).json({
        data: {
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

function postLoginUserHandler(
  useCase: MessengerUseCase,
  createToken: TokenCreator
) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const user = await useCase.login(req.body.name);
      const token = await createToken(user.id);
      res.status(200).json({
        data: {
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

function postMeHandler(useCase: MessengerUseCase) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const user = await useCase.findUser(res.locals.userId);
      res.status(200).json({
        data: {
          user: toUser(res.locals.userId, user),
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

function getSuggestedUsersHandler(useCase: MessengerUseCase) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const users = await useCase.findSuggestedUsers(res.locals.userId);
      res.status(200).json({
        data: {
          users: toUsers(res.locals.userId, users),
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

function searchUsersHandler(useCase: MessengerUseCase) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const users = await useCase.searchUsers(req.query.name as string);
      res.status(200).json({
        data: {
          users: toUsers(res.locals.userId, users),
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

// ̦Chat.
function postCreateChatHandler(useCase: MessengerUseCase) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const chat = await useCase.createChat(
        res.locals.userId,
        req.body.userIds
      );
      res.status(201).json({
        data: {
          chat: toChat(res.locals.userId, chat),
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

function getAllChatsHandler(useCase: MessengerUseCase) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const { users, chats } = await useCase.findAllChats(res.locals.userId);

      res.status(200).json({
        data: {
          users: toUsers(res.locals.userId, users),
          chats: toChats(res.locals.userId, chats),
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

function getChatByUserIdsHandler(useCase: MessengerUseCase) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const userIds = Array.isArray(req.query.userIds)
        ? req.query.userIds
        : [req.query.userIds];

      const chat = await useCase.findChatByUserIds(
        res.locals.userId,
        userIds as string[]
      );

      res.status(200).json({
        data: {
          chat: toChat(res.locals.userId, chat!),
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

function postCreateChatMessageHandler(
  useCase: MessengerUseCase,
  eventEmitter: EventEmitter
) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const message = await useCase.createChatMessage(
        req.query.type as string,
        res.locals.userId,
        req.params.chatId,
        req.body.body
      );

      eventEmitter.emit("message", res.locals.userId as UserId, message);

      res.status(201).json({
        data: {
          message: toChatMessage(res.locals.userId as UserId, message),
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

function getChatMessagesHandler(useCase: MessengerUseCase) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const messages = await useCase.findAllChatMessages(
        req.query.type as string,
        req.params.chatId
      );
      res.status(200).json({
        data: {
          messages: toChatMessages(res.locals.userId as UserId, messages),
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

export function createApi(
  useCase: MessengerUseCase,
  createToken: TokenCreator,
  verifyToken: TokenVerifier,
  eventEmitter: EventEmitter
) {
  return {
    // User.
    postRegisterUser: postRegisterUserHandler(useCase, createToken),
    postLoginUser: postLoginUserHandler(useCase, createToken),
    postMe: postMeHandler(useCase),
    searchUsers: searchUsersHandler(useCase),
    getSuggestedUsers: getSuggestedUsersHandler(useCase),

    // Chat.
    postCreateChat: postCreateChatHandler(useCase),
    getAllChats: getAllChatsHandler(useCase),
    getChatByUserIds: getChatByUserIdsHandler(useCase),
    postCreateChatMessage: postCreateChatMessageHandler(useCase, eventEmitter),
    getChatMessages: getChatMessagesHandler(useCase),
    getChatMessageEvents: getChatMessageEventsHandler(
      useCase,
      eventEmitter,
      verifyToken
    ),
  };
}
