// config.js stores all the environment variables that
// will be read from the process.env.
//
// All environment variables are strings, conversion to other types has to be handled manually.
//
// Validation will be performed by the caller using the
// environment variables.
import { v4 as uuidv4 } from "uuid";

export const db = {
  host: process.env.DB_HOST ?? "",
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME ?? "",
  username: process.env.DB_USER ?? "",
  password: process.env.DB_PASS ?? "",
  debug: true,
};

export const server = {
  id: uuidv4(),
  port: Number(process.env.PORT ?? 3000),
};

export const jwt = {
  secret: process.env.JWT_SECRET ?? "",
};
