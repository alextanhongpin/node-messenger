import { NextFunction, Request, Response } from "express";
import type { TokenCreator } from "features/messenger/types";
import { MessengerUseCase } from "features/messenger/usecase";

import {
  toChat,
  toChatMessage,
  toChatMessages,
  toChats,
  toUser,
  toUsers,
} from "./types";

// User.
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

function postCreateChatMessageHandler(useCase: MessengerUseCase) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const message = await useCase.createChatMessage(
        req.query.type as string,
        res.locals.userId,
        req.params.chatId,
        req.body.body
      );

      res.status(201).json({
        data: {
          message: toChatMessage(res.locals.userId, message),
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
          messages: toChatMessages(res.locals.userId, messages),
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

export function createApi(
  useCase: MessengerUseCase,
  createToken: TokenCreator
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
    postCreateChatMessage: postCreateChatMessageHandler(useCase),
    getChatMessages: getChatMessagesHandler(useCase),
  };
}
