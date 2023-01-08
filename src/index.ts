import EventEmitter from "events";
import { Response } from "express";
import { create } from "features/messenger";
import * as config from "infra/config";
import { createConn as createDbConn } from "infra/postgres";
import { createConn as createCacheConn } from "infra/redis";
import { createApp, start } from "infra/server";
import { authHandler, errorHandler } from "infra/server/middleware";
import type { Claims } from "infra/server/middleware/auth";
import { sign, verify } from "infra/server/middleware/auth";

async function main() {
  const app = createApp();
  const { sql, close: closeDb } = createDbConn(config.db);
  const { redis, close: closeCache } = await createCacheConn(
    config.redis.host,
    config.redis.port
  );

  app.use(authHandler(config.jwt.secret));

  const createToken = (userId: string) =>
    sign<Claims>(config.jwt.secret, { userId } as Claims);

  const verifyToken = (token: string) =>
    verify<Claims>(config.jwt.secret, token);

  const eventEmitter = new EventEmitter();
  const api = await create(
    sql,
    createToken,
    verifyToken,
    eventEmitter,
    redis,
    config.server.hostname
  );
  app.get("/health", function (_, res: Response) {
    res.status(200).json({
      hostname: config.server.hostname,
    });
  });
  app.use("/", api);

  // NOTE: This must be the last route.
  app.use(errorHandler);

  start(app, config.server.port, closeDb, closeCache);
}

main().catch(console.error);
