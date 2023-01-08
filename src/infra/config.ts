// config.js stores all the environment variables that
// will be read from the process.env.
//
// All environment variables are strings, conversion to other types has to be handled manually.
//
// Validation will be performed by the caller using the
// environment variables.
import os from "os";

export const db = {
  host: process.env.DB_HOST ?? "",
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME ?? "",
  username: process.env.DB_USER ?? "",
  password: process.env.DB_PASS ?? "",
  debug: true,
};

export const server = {
  hostname: os.hostname(),
  port: Number(process.env.PORT ?? 3000),
};

export const jwt = {
  secret: process.env.JWT_SECRET ?? "",
};

export const redis = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
};
