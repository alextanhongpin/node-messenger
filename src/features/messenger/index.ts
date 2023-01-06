import { Router } from "express";
import type { Sql } from "infra/postgres";
import { requireAuthHandler } from "infra/server/middleware";

import { createApi } from "./api";
import { createRepository } from "./repository";
import type { TokenCreator } from "./types";
import { createUsecase } from "./usecase";

export function create(sql: Sql, tokenCreator: TokenCreator): Router {
  const repo = createRepository(sql);
  const useCase = createUsecase(repo);
  const api = createApi(useCase, tokenCreator);

  const router = Router();
  // Public route.
  router.post("/register", api.postRegisterUser);
  router.post("/login", api.postLoginUser);

  // Private route.
  router.use(requireAuthHandler);
  router.post("/me", api.postMe);
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
