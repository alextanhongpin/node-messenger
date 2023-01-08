import { RedisClient } from "infra/redis";

const ONLINE_DURATION = 10_000;

export class PresenceUseCase {
  constructor(
    private redisClient: RedisClient,
    private key = "online_users:",
    private clearEverySeconds = ONLINE_DURATION * 1.2
  ) {
    this.#init();
  }

  #init() {
    setInterval(() => this.removeInactiveUsers(), this.clearEverySeconds);
  }

  // Why aren't there any offline method? Because a user may be logged in multiple devices.
  // In order to track that, we need to know how many devices the users are logged in,
  // and when the count is 0, then they are completely offline. However, identifying that is much more complicated.
  online(userId: string, duration = ONLINE_DURATION) {
    return this.redisClient.ZADD(
      this.key,
      [{ score: Date.now() + duration, value: userId }],
      { GT: true }
    );
  }

  async isOnline(userId: string): Promise<boolean> {
    const score = await this.redisClient.ZSCORE(this.key, userId);
    if (score === null) return false;
    return score > 0;
  }

  async isOnlineMulti(userIds: string[]): Promise<Record<string, boolean>> {
    try {
      const data = await Promise.allSettled(
        userIds.map((userId: string) => this.isOnline(userId))
      );
      const result: Record<string, boolean> = {};
      for (let i = 0; i < userIds.length; i++) {
        if (data[i].status === "fulfilled") {
          const res = data[i] as PromiseFulfilledResult<boolean>;
          result[userIds[i]] = res.value;
        } else {
          result[userIds[i]] = false;
        }
      }
      return result;
    } catch (error) {
      const result: Record<string, boolean> = {};
      for (const userId of userIds) {
        result[userId] = false;
      }
      return result;
    }
  }

  removeInactiveUsers() {
    return this.redisClient.ZREMRANGEBYSCORE(this.key, 0, Date.now());
  }
}
