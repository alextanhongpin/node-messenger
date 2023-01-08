import EventEmitter from "events";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { PresenceUseCase } from "features/presence";
import type { Sql } from "infra/postgres";
import type { RedisClient } from "infra/redis";
import { requireAuthHandler } from "infra/server/middleware";

import { createApi } from "./api";
import { createRepository } from "./repository";
import type { TokenCreator, TokenVerifier } from "./types";
import { createUsecase } from "./usecase";

export async function create(
  sql: Sql,
  tokenCreator: TokenCreator,
  tokenVerifier: TokenVerifier,
  eventEmitter: EventEmitter,
  redisClient: RedisClient,
  hostname: string
): Promise<Router> {
  const repo = createRepository(sql);
  const useCase = createUsecase(repo);
  const presenceUseCase = new PresenceUseCase(redisClient);
  const api = await createApi(
    useCase,
    presenceUseCase,
    tokenCreator,
    tokenVerifier,
    eventEmitter,
    redisClient,
    hostname
  );

  const router = Router();

  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 12, // Limit each IP to 12 requests per `window` (here, per 1 minutes, aka 1 request every 5 seconds)
    //message: 'Too many requests. Please try again later'.
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  // Public route.
  router.post("/register", api.postRegisterUser);
  router.post("/login", api.postLoginUser);
  router.get("/chats/:chatId/messages/events", api.getChatMessageEvents);

  // Private route.
  router.use(requireAuthHandler);
  router.post("/me", api.postMe);
  router.post("/me/online", apiLimiter, api.postOnlineStatus);
  router.get("/users/suggested", api.getSuggestedUsers);
  router.get("/users/search", api.searchUsers);

  // Chat.
  router.post("/chats", api.postCreateChat);
  router.get("/chats", api.getAllChats);
  router.get("/chats/search", api.getChatByUserIds);
  router.post("/chats/:chatId/messages", api.postCreateChatMessage);
  router.get("/chats/:chatId/messages", api.getChatMessages);

  return router;
}
