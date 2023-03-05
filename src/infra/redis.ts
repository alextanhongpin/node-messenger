import { createClient } from "redis";
export type RedisClient = ReturnType<typeof createClient>;

export async function createConn(host: string, port: number) {
  const client = createClient({ url: `redis://${host}:${port}` });
  await client.connect();
  return {
    redis: client,
    close: () => {
      console.log("closing redis");
      // Use .quit() instead of .disconnect() to ensure pending commands are sent to Redis before closing.
      return client.quit();
    },
  };
}
