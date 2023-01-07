import cors from "cors";
import express, { Express } from "express";

export function createApp(): Express {
  const app = express();

  // Mandatory middlewares.
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors());

  return app;
}

export function start(app: Express, port: number) {
  if (!port) throw new Error("PORT not specified");

  const server = app.listen(port, () => {
    console.log(`listening to port *:${port}. press ctrl + c to cancel`);
  });

  // Reference: https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/
  function closeGracefully(signal: number) {
    console.debug("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      console.debug("HTTP server closed");
      process.kill(process.pid, signal);
    });
  }

  // Graceful shutdown;.
  process.on("SIGINT", closeGracefully);
  process.on("SIGTERM", closeGracefully);
}
