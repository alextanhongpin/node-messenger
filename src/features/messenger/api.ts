import { NextFunction, Request, Response } from "express";

import type { TokenCreator } from "./types";
import { MessengerUseCase } from "./usecase";

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
          user,
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
          users,
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
          users,
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
          chat,
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
          users,
          chats,
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
          chat,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

// ̦PrivateChat.
function postCreatePrivateChatHandler(useCase: MessengerUseCase) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const chat = await useCase.createPrivateChat(
        res.locals.userId,
        req.body.otherUserId
      );

      res.status(201).json({
        data: {
          chat,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

function postCreatePrivateChatMessageHandler(useCase: MessengerUseCase) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const message = await useCase.createPrivateChatMessage(
        req.params.privateChatId,
        res.locals.userId,
        req.body.body
      );

      res.status(201).json({
        data: {
          message,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

function getPrivateChatMessagesHandler(useCase: MessengerUseCase) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const messages = await useCase.findAllPrivateChatMessages(
        res.locals.userId,
        req.params.privateChatId
      );
      res.status(200).json({
        data: {
          messages,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

// GroupChat.
function getGroupChatMessagesHandler(useCase: MessengerUseCase) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const messages = await useCase.findAllGroupChatMessages(
        res.locals.userId,
        req.params.groupChatId
      );

      res.status(200).json({
        data: {
          messages,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

function postCreateGroupChatHandler(useCase: MessengerUseCase) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const [chat, participants] = await useCase.createGroupChat(
        res.locals.userId,
        req.body.userIds
      );

      res.status(201).json({
        data: {
          chat,
          participants,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

function postCreateGroupChatMessageHandler(useCase: MessengerUseCase) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const message = await useCase.createGroupChatMessage(
        req.params.groupChatId,
        res.locals.userId,
        req.body.body
      );
      res.status(201).json({
        data: {
          message,
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

    // PrivateChat.
    postCreatePrivateChat: postCreatePrivateChatHandler(useCase),
    postCreatePrivateChatMessage: postCreatePrivateChatMessageHandler(useCase),
    getPrivateChatMessages: getPrivateChatMessagesHandler(useCase),

    // GroupChat.
    postCreateGroupChat: postCreateGroupChatHandler(useCase),
    postCreateGroupChatMessage: postCreateGroupChatMessageHandler(useCase),
    getGroupChatMessages: getGroupChatMessagesHandler(useCase),
  };
}
