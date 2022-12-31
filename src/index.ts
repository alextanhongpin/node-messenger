import { create } from "features/messenger";
import * as config from "infra/config";
import { createConn } from "infra/postgres";
import { createApp, start } from "infra/server";
import { authHandler, errorHandler } from "infra/server/middleware";
import type { Claims } from "infra/server/middleware/auth";
import { sign } from "infra/server/middleware/auth";

async function main() {
  const app = createApp();
  const sql = createConn(config.db);

  app.use(authHandler(config.jwt.secret));

  const api = create(sql, (userId: string) =>
    sign(config.jwt.secret, { userId } as Claims)
  );
  app.use("/", api);

  // NOTE: This must be the last route.
  app.use(errorHandler);

  start(app, config.server.port);
}

main().catch(console.error);
