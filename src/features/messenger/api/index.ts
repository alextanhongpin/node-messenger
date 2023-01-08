import EventEmitter from "events";
import { NextFunction, Request, Response } from "express";
import type {
  ChatMessage,
  TokenCreator,
  TokenVerifier,
  UserId,
} from "features/messenger/types";
import { MessengerUseCase } from "features/messenger/usecase";
import { RedisClient } from "infra/redis";
import { v4 as uuidv4 } from "uuid";

import {
  ChatMessageResponse,
  SSEResponse,
  toChat,
  toChatMessage,
  toChatMessages,
  toChats,
  toUser,
  toUsers,
} from "./types";

const MINUTE = 60_000;

async function getChatMessageEventsHandler(
  useCase: MessengerUseCase,
  eventEmitter: EventEmitter,
  verifyToken: TokenVerifier,
  redisClient: RedisClient,
  hostname: string
) {
  const headers = {
    "Content-Type": "text/event-stream;charset=UTF-8",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
    // Disables buffering for Nginx. Required for SSE to work with Nginx.
    //
    // Explanation here:
    // https://www.nginx.com/resources/wiki/start/topics/examples/x-accel/
    //
    // Setting this to "no" will allow unbuffered responses suitable for Comet
    // and HTTP streaming applications. Setting this to "yes" will allow the
    // response to be cached.
    "X-Accel-Buffering": "no",
  };

  // One chat id can be subscribed by multiple users.
  const userIdsByChatId: Record<string, Set<string>> = {};

  // One client id can only have on Response.
  const resByClientId: Record<string, Response> = {};

  // One user id can have multiple client ids (opening multiple tabs).
  const clientIdsByUserId: Record<string, Set<string>> = {};

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
    clientIdsByUserId[userId]?.delete(clientId);
    if (!clientIdsByUserId[userId]?.size) {
      delete clientIdsByUserId[userId];
    }
    // Delete users
    userIdsByChatId[chatId]?.delete(userId);
    if (!userIdsByChatId[chatId]?.size) {
      delete userIdsByChatId[chatId];
    }
  }

  const subscriber = await redisClient.duplicate();
  await subscriber.connect();
  await subscriber.subscribe(hostname, (rawMessage: string) => {
    console.log("subscribed to:", hostname);
    try {
      const msg: ChatMessage = JSON.parse(rawMessage);
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
    } catch (error) {
      console.error(error);
    }
  });

  const publisher = await redisClient.duplicate();
  await publisher.connect();

  eventEmitter.on("message", async (userId: UserId, message: ChatMessage) => {
    const hostnames = await redisClient.SMEMBERS(
      `chat:${message.chatId}:hosts`
    );
    console.log("received message, potential hostnames", hostnames);
    const promises = hostnames.map((hostname: string) =>
      publisher.publish(hostname, JSON.stringify(message))
    );
    const data = await Promise.allSettled(promises);
    console.log({ data });
  });

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
      // Register the chat.
      await redisClient.SADD(`chat:${chatId}:hosts`, hostname);

      const interval = setInterval(async () => {
        // Every minute, set the chat room to expire after 2 minutes.
        console.log("refresh");
        await redisClient.EXPIRE(`chat:${chatId}:hosts`, 2 * MINUTE, "GT");
      }, MINUTE);

      req.on("close", async () => {
        deregister(userId, chatId, clientId);
        await redisClient.SREM(`chat:${chatId}:hosts`, hostname);
        clearInterval(interval);
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

export async function createApi(
  useCase: MessengerUseCase,
  createToken: TokenCreator,
  verifyToken: TokenVerifier,
  eventEmitter: EventEmitter,
  redisClient: RedisClient,
  hostname: string
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
    getChatMessageEvents: await getChatMessageEventsHandler(
      useCase,
      eventEmitter,
      verifyToken,
      redisClient,
      hostname
    ),
  };
}
